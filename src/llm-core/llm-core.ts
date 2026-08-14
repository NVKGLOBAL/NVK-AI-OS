// @ts-nocheck
import { ByteBPEWithSpecialTokens, TokenizerConfig } from './tokenizer';
import { WGSL_SHADERS } from './shaders';

export interface LLMConfig {
  vocabSize: number;
  dModel: number;
  nHeads: number;
  dHead: number; // dModel / nHeads
  nLayers: number;
  dFF: number; // Hidden layer dimension of feed-forward network
  maxSeqLen: number;
}

export interface GenerationOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxNewTokens?: number;
  onToken?: (token: string) => void;
}

export class LLMCore {
  public config: LLMConfig = {
    vocabSize: 1200,
    dModel: 128,
    nHeads: 4,
    dHead: 32,
    nLayers: 2,
    dFF: 512,
    maxSeqLen: 256,
  };

  public tokenizer: ByteBPEWithSpecialTokens;
  public initialized = false;
  public webGpuSupported = false;
  public errorMsg: string | null = null;
  
  // WebGPU Handles
  private device: GPUDevice | null = null;
  private pipelines: Record<string, GPUComputePipeline> = {};
  
  // Weights Loaded onto GPU Storage Buffers
  private weightBuffers: Record<string, GPUBuffer> = {};

  constructor() {
    this.tokenizer = new ByteBPEWithSpecialTokens();
  }

  /**
   * Initializes the WebGPU LLM Core by requesting the adapter & compiling pipelines.
   * Auto-falls back to randomized dummy weights if assets fail to download or are empty.
   */
  public async init(weightsPath?: string, tokenizerPath?: string): Promise<boolean> {
    try {
      if (this.initialized) return true;

      // 1. Check navigator.gpu availability
      if (!navigator.gpu) {
        throw new Error("WebGPU is not supported or disabled in this browser. Please use Chrome/Edge or ensure flags are enabled.");
      }
      this.webGpuSupported = true;

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No compatible graphics adapter found supporting WebGPU.");
      }

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: Math.min(adapter.limits.maxStorageBufferBindingSize, 512 * 1024 * 1024)
        }
      });

      // 2. Load tokenizer config (if available)
      if (tokenizerPath) {
        try {
          const res = await fetch(tokenizerPath);
          if (res.ok) {
            const tokConfig = await res.json() as TokenizerConfig;
            this.tokenizer = new ByteBPEWithSpecialTokens(tokConfig);
            this.config.vocabSize = this.tokenizer.getVocabSize();
            console.log(`LLMCore loaded custom tokenizer with vocabulary size: ${this.config.vocabSize}`);
          }
        } catch (e) {
          console.warn("Could not load custom tokenizer from asset, using default baseline tokenizer.", e);
        }
      }

      // 3. Compile WGSL Shader Pipelines
      await this.compilePipelines();

      // 4. Hydrate weights (load flat binary file or generate fallback weights)
      let weightsArrayBuffer: ArrayBuffer | null = null;
      if (weightsPath) {
        try {
          const res = await fetch(weightsPath);
          if (res.ok) {
            weightsArrayBuffer = await res.arrayBuffer();
            console.log(`LLMCore: Successfully loaded binary weight pack (${weightsArrayBuffer.byteLength} bytes)`);
          }
        } catch (e) {
          console.warn("Could not load flat binary weights, synthesizing pre-initialized model state in GPU memory.", e);
        }
      }

      if (weightsArrayBuffer) {
        this.loadBinaryWeights(new Float32Array(weightsArrayBuffer));
      } else {
        this.loadDummyWeights();
      }

      this.initialized = true;
      this.errorMsg = null;
      return true;
    } catch (e: any) {
      this.initialized = false;
      this.errorMsg = e.message || String(e);
      console.error("LLMCore: Setup critical failure", e);
      return false;
    }
  }

  private async compilePipelines() {
    if (!this.device) return;

    const compileModulePipeline = async (name: string, code: string): Promise<GPUComputePipeline> => {
      const shaderMod = this.device!.createShaderModule({ label: `${name}_module`, code });
      return await this.device!.createComputePipelineAsync({
        label: `${name}_pipeline`,
        layout: "auto",
        compute: { module: shaderMod, entryPoint: "main" }
      });
    };

    this.pipelines.embedding = await compileModulePipeline("embedding", WGSL_SHADERS.embedding);
    this.pipelines.layerNorm = await compileModulePipeline("layerNorm", WGSL_SHADERS.layerNorm);
    this.pipelines.matmul = await compileModulePipeline("matmul", WGSL_SHADERS.matmul);
    this.pipelines.attention = await compileModulePipeline("attention", WGSL_SHADERS.attentionUnified);
    this.pipelines.softmax = await compileModulePipeline("softmax", WGSL_SHADERS.softmaxSampling);

    console.log("LLMCore: All 5 core WebGPU compute pipelines compiled successfully.");
  }

  /**
   * Loads from a pre-allocated flat Float32Array containing standard FP32 weights sequence.
   */
  private loadBinaryWeights(flatArray: Float32Array) {
    if (!this.device) return;

    let offset = 0;
    const readFlatBuffer = (name: string, size: number) => {
      let subArr: Float32Array;
      if (offset + size <= flatArray.length) {
        subArr = flatArray.subarray(offset, offset + size);
        offset += size;
      } else {
        console.warn(`Weight buffer overflow for ${name}. Allocating dynamic defaults.`);
        subArr = new Float32Array(size).map(() => (Math.random() - 0.5) * 0.02);
      }
      return this.createGPUBufferWithData(name, subArr, GPUBufferUsage.STORAGE);
    };

    const dModel = this.config.dModel;
    const vocabSize = this.config.vocabSize;
    const maxSeqLen = this.config.maxSeqLen;
    const dFF = this.config.dFF;

    // te & pe
    this.weightBuffers["w_te"] = readFlatBuffer("w_te", vocabSize * dModel);
    this.weightBuffers["w_pe"] = readFlatBuffer("w_pe", maxSeqLen * dModel);

    // Layers parameters
    for (let l = 0; l < this.config.nLayers; l++) {
      this.weightBuffers[`l_${l}_ln1_w`] = readFlatBuffer(`l_${l}_ln1_w`, dModel);
      this.weightBuffers[`l_${l}_ln1_b`] = readFlatBuffer(`l_${l}_ln1_b`, dModel);

      this.weightBuffers[`l_${l}_w_q`] = readFlatBuffer(`l_${l}_w_q`, dModel * dModel);
      this.weightBuffers[`l_${l}_b_q`] = readFlatBuffer(`l_${l}_b_q`, dModel);

      this.weightBuffers[`l_${l}_w_k`] = readFlatBuffer(`l_${l}_w_k`, dModel * dModel);
      this.weightBuffers[`l_${l}_b_k`] = readFlatBuffer(`l_${l}_b_k`, dModel);

      this.weightBuffers[`l_${l}_w_v`] = readFlatBuffer(`l_${l}_w_v`, dModel * dModel);
      this.weightBuffers[`l_${l}_b_v`] = readFlatBuffer(`l_${l}_b_v`, dModel);

      this.weightBuffers[`l_${l}_w_proj`] = readFlatBuffer(`l_${l}_w_proj`, dModel * dModel);
      this.weightBuffers[`l_${l}_b_proj`] = readFlatBuffer(`l_${l}_b_proj`, dModel);

      this.weightBuffers[`l_${l}_ln2_w`] = readFlatBuffer(`l_${l}_ln2_w`, dModel);
      this.weightBuffers[`l_${l}_ln2_b`] = readFlatBuffer(`l_${l}_ln2_b`, dModel);

      this.weightBuffers[`l_${l}_w_fc`] = readFlatBuffer(`l_${l}_w_fc`, dModel * dFF);
      this.weightBuffers[`l_${l}_b_fc`] = readFlatBuffer(`l_${l}_b_fc`, dFF);

      this.weightBuffers[`l_${l}_w_fc_proj`] = readFlatBuffer(`l_${l}_w_fc_proj`, dFF * dModel);
      this.weightBuffers[`l_${l}_b_fc_proj`] = readFlatBuffer(`l_${l}_b_fc_proj`, dModel);
    }

    // Final LN
    this.weightBuffers["ln_f_w"] = readFlatBuffer("ln_f_w", dModel);
    this.weightBuffers["ln_f_b"] = readFlatBuffer("ln_f_b", dModel);

    // LM Head
    this.weightBuffers["w_lm_head"] = readFlatBuffer("w_lm_head", vocabSize * dModel);

    // Dynamic KV-caches allocation
    this.allocateKVCaches();
    console.log(`LLMCore loaded sequential arrays. Extracted total ${offset} float32 variables.`);
  }

  /**
   * Populates and initialises the WebGPU memory layout with random weights for local sandbox execution.
   */
  private loadDummyWeights() {
    console.log("LLMCore: Initializing dynamic model weights fallback.");
    const dModel = this.config.dModel;
    const vocabSize = this.config.vocabSize;
    const maxSeqLen = this.config.maxSeqLen;
    const dFF = this.config.dFF;

    const makeRand = (size: number, scale = 0.02) => {
      const arr = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        arr[i] = (Math.random() - 0.5) * scale;
      }
      return arr;
    };

    const makeOnes = (size: number) => {
      const arr = new Float32Array(size);
      arr.fill(1.0);
      return arr;
    };

    this.weightBuffers["w_te"] = this.createGPUBufferWithData("w_te", makeRand(vocabSize * dModel), GPUBufferUsage.STORAGE);
    this.weightBuffers["w_pe"] = this.createGPUBufferWithData("w_pe", makeRand(maxSeqLen * dModel), GPUBufferUsage.STORAGE);

    for (let l = 0; l < this.config.nLayers; l++) {
      this.weightBuffers[`l_${l}_ln1_w`] = this.createGPUBufferWithData(`l_${l}_ln1_w`, makeOnes(dModel), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_ln1_b`] = this.createGPUBufferWithData(`l_${l}_ln1_b`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_q`] = this.createGPUBufferWithData(`l_${l}_w_q`, makeRand(dModel * dModel, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_q`] = this.createGPUBufferWithData(`l_${l}_b_q`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_k`] = this.createGPUBufferWithData(`l_${l}_w_k`, makeRand(dModel * dModel, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_k`] = this.createGPUBufferWithData(`l_${l}_b_k`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_v`] = this.createGPUBufferWithData(`l_${l}_w_v`, makeRand(dModel * dModel, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_v`] = this.createGPUBufferWithData(`l_${l}_b_v`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_proj`] = this.createGPUBufferWithData(`l_${l}_w_proj`, makeRand(dModel * dModel, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_proj`] = this.createGPUBufferWithData(`l_${l}_b_proj`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_ln2_w`] = this.createGPUBufferWithData(`l_${l}_ln2_w`, makeOnes(dModel), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_ln2_b`] = this.createGPUBufferWithData(`l_${l}_ln2_b`, new Float32Array(dModel), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_fc`] = this.createGPUBufferWithData(`l_${l}_w_fc`, makeRand(dModel * dFF, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_fc`] = this.createGPUBufferWithData(`l_${l}_b_fc`, new Float32Array(dFF), GPUBufferUsage.STORAGE);

      this.weightBuffers[`l_${l}_w_fc_proj`] = this.createGPUBufferWithData(`l_${l}_w_fc_proj`, makeRand(dFF * dModel, 0.05), GPUBufferUsage.STORAGE);
      this.weightBuffers[`l_${l}_b_fc_proj`] = this.createGPUBufferWithData(`l_${l}_b_fc_proj`, new Float32Array(dModel), GPUBufferUsage.STORAGE);
    }

    this.weightBuffers["ln_f_w"] = this.createGPUBufferWithData("ln_f_w", makeOnes(dModel), GPUBufferUsage.STORAGE);
    this.weightBuffers["ln_f_b"] = this.createGPUBufferWithData("ln_f_b", new Float32Array(dModel), GPUBufferUsage.STORAGE);
    
    // Set LM head bias ties or rand
    this.weightBuffers["w_lm_head"] = this.createGPUBufferWithData("w_lm_head", makeRand(vocabSize * dModel, 0.05), GPUBufferUsage.STORAGE);

    this.allocateKVCaches();
    console.log("LLMCore: Fallback random-initialized weights cached on GPU device.");
  }

  private allocateKVCaches() {
    if (!this.device) return;
    const cacheBytes = this.config.maxSeqLen * this.config.dModel * 4; // Max length floats

    for (let l = 0; l < this.config.nLayers; l++) {
      this.weightBuffers[`l_${l}_k_cache`] = this.device.createBuffer({
        label: `layer_${l}_k_cache`,
        size: cacheBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });

      this.weightBuffers[`l_${l}_v_cache`] = this.device.createBuffer({
        label: `layer_${l}_v_cache`,
        size: cacheBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
    }
  }

  /**
   * Helper allocation method
   */
  private createGPUBufferWithData(label: string, data: Float32Array, usage: number): GPUBuffer {
    if (!this.device) throw new Error("GPU Device is missing.");
    const buffer = this.device.createBuffer({
      label,
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  }

  /**
   * Generates continuous text based on a prompt context
   */
  public async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    if (!this.initialized) {
      const ok = await this.init();
      if (!ok) return "LLMCore Error: Connection/GPU failure \n" + this.errorMsg;
    }

    const {
      temperature = 0.7,
      topK = 40,
      topP = 0.9,
      maxNewTokens = 100,
      onToken
    } = options || {};

    const promptTokens = this.tokenizer.encode(prompt);
    if (promptTokens.length === 0) return "";

    const activeTokens = [...promptTokens];
    const maxSeqLen = this.config.maxSeqLen;
    const dModel = this.config.dModel;
    const vocabSize = this.config.vocabSize;

    // Setup sequence parameters
    let currentTokenIndex = 0;
    
    // Allocate shared activation/working buffers on GPU to execute execution graphs
    const tokensInGPU = this.device!.createBuffer({
      size: maxSeqLen * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const residualBackup = this.device!.createBuffer({
      size: maxSeqLen * dModel * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const activation1 = this.device!.createBuffer({ // input embedding
      size: maxSeqLen * dModel * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const activation2 = this.device!.createBuffer({ // normalized node
      size: maxSeqLen * dModel * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    // Sub-components layers embeddings
    const qIn = this.device!.createBuffer({ size: maxSeqLen * dModel * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
    const kIn = this.device!.createBuffer({ size: maxSeqLen * dModel * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
    const vIn = this.device!.createBuffer({ size: maxSeqLen * dModel * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
    const oBlended = this.device!.createBuffer({ size: maxSeqLen * dModel * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });

    // MLP buffers
    const mlpHidden = this.device!.createBuffer({
      size: maxSeqLen * this.config.dFF * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    // Probabilities and logit output mapping buffers
    const lastTokenLogits = this.device!.createBuffer({
      size: vocabSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const lastTokenProbs = this.device!.createBuffer({
      size: vocabSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const readbackProbs = this.device!.createBuffer({
      size: vocabSize * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // 1. Prefill Step (Process initial prompt)
    let seqLen = promptTokens.length;
    this.device!.queue.writeBuffer(tokensInGPU, 0, new Uint32Array(promptTokens));

    await this.runForwardPass(
      seqLen,
      tokensInGPU,
      activation1,
      activation2,
      residualBackup,
      qIn,
      kIn,
      vIn,
      oBlended,
      mlpHidden,
      lastTokenLogits,
      lastTokenProbs,
      currentTokenIndex,
      true // prefill
    );

    currentTokenIndex += seqLen - 1; // set pointer to match head of context

    // Read back final logits of the prefill
    let nextProbArray = await this.readbackProbArray(lastTokenProbs, readbackProbs);
    let nextTokenId = this.sample(nextProbArray, temperature, topK, topP);
    
    // Return early if we already hit bounds
    if (nextTokenId === this.tokenizer.specialTokens["<|endoftext|>"] || activeTokens.length >= maxSeqLen) {
      return this.tokenizer.decode([nextTokenId]);
    }

    let outText = "";
    const generatedTokenIds: number[] = [];
    
    // Autoregressive token-by-token loop
    const maxTokensToGen = Math.min(maxNewTokens, maxSeqLen - promptTokens.length - 1);
    
    for (let t = 0; t < maxTokensToGen; t++) {
      activeTokens.push(nextTokenId);
      generatedTokenIds.push(nextTokenId);

      const decodedString = this.tokenizer.decode([nextTokenId]);
      outText += decodedString;
      if (onToken) onToken(decodedString);

      if (nextTokenId === this.tokenizer.specialTokens["<|endoftext|>"]) {
        break;
      }

      // Generation mode: length of query seqLen is 1
      seqLen = 1;
      currentTokenIndex += 1;

      // Write only the single newly generated token element
      this.device!.queue.writeBuffer(tokensInGPU, 0, new Uint32Array([nextTokenId]));

      await this.runForwardPass(
        seqLen,
        tokensInGPU,
        activation1,
        activation2,
        residualBackup,
        qIn,
        kIn,
        vIn,
        oBlended,
        mlpHidden,
        lastTokenLogits,
        lastTokenProbs,
        currentTokenIndex,
        false // Generation mode (autoregressive single step)
      );

      nextProbArray = await this.readbackProbArray(lastTokenProbs, readbackProbs);
      nextTokenId = this.sample(nextProbArray, temperature, topK, topP);
    }

    // Clean up local buffers! Keep GC neat on VRAM
    tokensInGPU.destroy();
    residualBackup.destroy();
    activation1.destroy();
    activation2.destroy();
    qIn.destroy();
    kIn.destroy();
    vIn.destroy();
    oBlended.destroy();
    mlpHidden.destroy();
    lastTokenLogits.destroy();
    lastTokenProbs.destroy();
    readbackProbs.destroy();

    return outText;
  }

  private async readbackProbArray(probsBuffer: GPUBuffer, readbackBuffer: GPUBuffer): Promise<Float32Array> {
    const encoder = this.device!.createCommandEncoder();
    encoder.copyBufferToBuffer(probsBuffer, 0, readbackBuffer, 0, this.config.vocabSize * 4);
    this.device!.queue.submit([encoder.finish()]);

    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const mapped = new Float32Array(readbackBuffer.getMappedRange().slice(0));
    readbackBuffer.unmap();
    return mapped;
  }

  /**
   * Samples the next token index given probability values
   */
  private sample(probs: Float32Array, temp: number, topK: number, topP: number): number {
    // 1. Softmax fallback safety checks
    let validProbs = Array.from(probs).map((p, idx) => ({ p, idx }));
    
    // Sort descending
    validProbs.sort((a, b) => b.p - a.p);

    // 2. Apply Top-K filter
    if (topK > 0 && topK < validProbs.length) {
      validProbs = validProbs.slice(0, topK);
    }

    // 3. Apply Top-P (nucleus) filter
    if (topP > 0 && topP < 1.0) {
      let cumulativeSum = 0;
      let cutoffIndex = validProbs.length;
      for (let i = 0; i < validProbs.length; i++) {
        cumulativeSum += validProbs[i].p;
        if (cumulativeSum >= topP) {
          cutoffIndex = i + 1;
          break;
        }
      }
      validProbs = validProbs.slice(0, Math.max(1, cutoffIndex));
    }

    // Normalized remaining candidates
    const sum = validProbs.reduce((acc, current) => acc + current.p, 0);
    if (sum <= 0) {
      return validProbs[0]?.idx ?? 0;
    }

    const r = Math.random() * sum;
    let currentSum = 0;
    for (const cand of validProbs) {
      currentSum += cand.p;
      if (r <= currentSum) {
        return cand.idx;
      }
    }

    return validProbs[0].idx;
  }

  /**
   * Executes the full transformer graph forward pass on the GPU sequentially.
   */
  private async runForwardPass(
    seqLen: number,
    tokensBuf: GPUBuffer,
    act1: GPUBuffer,
    act2: GPUBuffer,
    resBack: GPUBuffer,
    qIn: GPUBuffer,
    kIn: GPUBuffer,
    vIn: GPUBuffer,
    oBlended: GPUBuffer,
    mlpHid: GPUBuffer,
    logitsOut: GPUBuffer,
    probsOut: GPUBuffer,
    currentTokenIndex: number,
    isPrefill: boolean
  ) {
    if (!this.device) return;

    const dModel = this.config.dModel;
    const vocabSize = this.config.vocabSize;
    const maxSeqLen = this.config.maxSeqLen;
    const dFF = this.config.dFF;

    const encoder = this.device.createCommandEncoder();

    // ==========================================
    // LAYER 0: Embedding Lookup & Positional Encoding
    // ==========================================
    {
      const cfgBuffer = this.device.createBuffer({
        size: 20,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint32Array(cfgBuffer.getMappedRange()).set([
        vocabSize,
        dModel,
        maxSeqLen,
        seqLen,
        currentTokenIndex
      ]);
      cfgBuffer.unmap();

      const ent = this.pipelines.embedding.getBindGroupLayout(0);
      const bg = this.device.createBindGroup({
        layout: ent,
        entries: [
          { binding: 0, resource: { buffer: cfgBuffer } },
          { binding: 1, resource: { buffer: tokensBuf } },
          { binding: 2, resource: { buffer: this.weightBuffers["w_te"] } },
          { binding: 3, resource: { buffer: this.weightBuffers["w_pe"] } },
          { binding: 4, resource: { buffer: act1 } } // Output
        ]
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipelines.embedding);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil((seqLen * dModel) / 256));
      pass.end();
    }

    // ==========================================
    // LAYER BLOCKS (1..N)
    // ==========================================
    for (let l = 0; l < this.config.nLayers; l++) {
      // 1. LN1 LayerNorm: inputs act1 -> outputs act2
      this.dispatchLayerNorm(encoder, seqLen, act1, this.weightBuffers[`l_${l}_ln1_w`], this.weightBuffers[`l_${l}_ln1_b`], act2);

      // Backup current act1 as residual stream context
      encoder.copyBufferToBuffer(act1, 0, resBack, 0, seqLen * dModel * 4);

      // 2. Q, K, V Projections: matmul normalized inputs act2 -> project buffers
      this.dispatchMatMul(encoder, seqLen, dModel, dModel, act2, this.weightBuffers[`l_${l}_w_q`], this.weightBuffers[`l_${l}_b_q`], qIn);
      this.dispatchMatMul(encoder, seqLen, dModel, dModel, act2, this.weightBuffers[`l_${l}_w_k`], this.weightBuffers[`l_${l}_b_k`], kIn);
      this.dispatchMatMul(encoder, seqLen, dModel, dModel, act2, this.weightBuffers[`l_${l}_w_v`], this.weightBuffers[`l_${l}_b_v`], vIn);

      // 3. Attention calculation:
      {
        const attnCfgBuffer = this.device.createBuffer({
          size: 28,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true
        });
        new Uint32Array(attnCfgBuffer.getMappedRange()).set([
          seqLen,
          maxSeqLen,
          dModel,
          this.config.nHeads,
          this.config.dHead,
          currentTokenIndex,
          isPrefill ? 1 : 0
        ]);
        attnCfgBuffer.unmap();

        const ent = this.pipelines.attention.getBindGroupLayout(0);
        const bg = this.device.createBindGroup({
          layout: ent,
          entries: [
            { binding: 0, resource: { buffer: attnCfgBuffer } },
            { binding: 1, resource: { buffer: qIn } },
            { binding: 2, resource: { buffer: this.weightBuffers[`l_${l}_k_cache`] } }, // state tracking caches
            { binding: 3, resource: { buffer: this.weightBuffers[`l_${l}_v_cache`] } },
            { binding: 4, resource: { buffer: kIn } },
            { binding: 5, resource: { buffer: vIn } },
            { binding: 6, resource: { buffer: oBlended } } // Blended output
          ]
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipelines.attention);
        pass.setBindGroup(0, bg);
        // Dispatch sequence-by-heads grid
        pass.dispatchWorkgroups(seqLen, this.config.nHeads);
        pass.end();
      }

      // 4. Attention output projection + residual add back (inputs: oBlended * w_proj -> outputs: act1)
      this.dispatchMatMul(encoder, seqLen, dModel, dModel, oBlended, this.weightBuffers[`l_${l}_w_proj`], this.weightBuffers[`l_${l}_b_proj`], act1, resBack, true, 0);

      // 5. MLP Sequence LN2 LayerNorm: inputs act1 -> outputs act2
      this.dispatchLayerNorm(encoder, seqLen, act1, this.weightBuffers[`l_${l}_ln2_w`], this.weightBuffers[`l_${l}_ln2_b`], act2);

      // Copy current act1 as residual context backup before Feed-Forward
      encoder.copyBufferToBuffer(act1, 0, resBack, 0, seqLen * dModel * 4);

      // 6. MLP Layer 1 (Dense with GELU Activation): inputs act2 -> outputs mlpHid
      this.dispatchMatMul(encoder, seqLen, dFF, dModel, act2, this.weightBuffers[`l_${l}_w_fc`], this.weightBuffers[`l_${l}_b_fc`], mlpHid, undefined, false, 1);

      // 7. MLP Layer 2 (Dense projection + residual skip): inputs mlpHid -> outputs act1
      this.dispatchMatMul(encoder, seqLen, dModel, dFF, mlpHid, this.weightBuffers[`l_${l}_w_fc_proj`], this.weightBuffers[`l_${l}_b_fc_proj`], act1, resBack, true, 0);
    }

    // ==========================================
    // FINAL LAYER-NORM (ln_f): inputs act1 -> outputs act2
    // ==========================================
    this.dispatchLayerNorm(encoder, seqLen, act1, this.weightBuffers["ln_f_w"], this.weightBuffers["ln_f_b"], act2);

    // ==========================================
    // LM HEAD LOGITS (Only compute last token row for decoder optimization)
    // ==========================================
    // We only need final logits of the LAST token seqLen - 1
    // A projection from d_model to vocabSize
    const lastTokenOffsetBytes = (seqLen - 1) * dModel * 4;

    // We can write a specific single-token matmul or we can slice the last row. Let's do a slice logic or standard matmul
    {
      const mmCfgBuffer = this.device.createBuffer({
        size: 20,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      // A shape: [1, d_model] -> Offset in act2 is lastTokenOffset
      // B shape: [d_model, vocabSize] ---> w_lm_head
      // Bias shape: [vocabSize] ---> zero biased
      new Uint32Array(mmCfgBuffer.getMappedRange()).set([
        1, // m
        vocabSize, // n
        dModel, // k
        0, // no activation
        0  // no residual
      ]);
      mmCfgBuffer.unmap();

      const dummyResidual = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE });
      const dummyBias = this.device.createBuffer({ size: vocabSize * 4, usage: GPUBufferUsage.STORAGE }); // zero-bias

      const ent = this.pipelines.matmul.getBindGroupLayout(0);
      const bg = this.device.createBindGroup({
        layout: ent,
        entries: [
          { binding: 0, resource: { buffer: mmCfgBuffer } },
          { binding: 1, resource: { buffer: act2, offset: lastTokenOffsetBytes, size: dModel * 4 } }, // slice only last token
          { binding: 2, resource: { buffer: this.weightBuffers["w_lm_head"] } },
          { binding: 3, resource: { buffer: dummyBias } },
          { binding: 4, resource: { buffer: dummyResidual } },
          { binding: 5, resource: { buffer: logitsOut } }
        ]
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipelines.matmul);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(vocabSize / 16), 1);
      pass.end();
    }

    // ==========================================
    // SOFTMAX / ARGMAP OF LOGITS -> probsOut
    // ==========================================
    {
      const smCfgBuffer = this.device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      const range = smCfgBuffer.getMappedRange();
      new Uint32Array(range, 0, 1).set([vocabSize]);
      new Float32Array(range, 4, 1).set([1.0]); // Temp parameter placeholder
      smCfgBuffer.unmap();

      const ent = this.pipelines.softmax.getBindGroupLayout(0);
      const bg = this.device.createBindGroup({
        layout: ent,
        entries: [
          { binding: 0, resource: { buffer: smCfgBuffer } },
          { binding: 1, resource: { buffer: logitsOut } },
          { binding: 2, resource: { buffer: probsOut } }
        ]
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipelines.softmax);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(1); // One thread block is enough for smaller vocabulary
      pass.end();
    }

    // Finalize queues
    this.device.queue.submit([encoder.finish()]);
  }

  // Sub-dispatches helper helpers
  private dispatchLayerNorm(
    encoder: GPUCommandEncoder,
    seqLen: number,
    inputBuf: GPUBuffer,
    gammaBuf: GPUBuffer,
    betaBuf: GPUBuffer,
    outputBuf: GPUBuffer
  ) {
    if (!this.device) return;

    const lnCfg = this.device.createBuffer({
      size: 12,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    const range = lnCfg.getMappedRange();
    new Uint32Array(range, 0, 2).set([this.config.dModel, seqLen]);
    new Float32Array(range, 8, 1).set([1e-5]); // variance offset tolerance index
    lnCfg.unmap();

    const ent = this.pipelines.layerNorm.getBindGroupLayout(0);
    const bg = this.device.createBindGroup({
      layout: ent,
      entries: [
        { binding: 0, resource: { buffer: lnCfg } },
        { binding: 1, resource: { buffer: inputBuf } },
        { binding: 2, resource: { buffer: gammaBuf } },
        { binding: 3, resource: { buffer: betaBuf } },
        { binding: 4, resource: { buffer: outputBuf } }
      ]
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipelines.layerNorm);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(seqLen / 64));
    pass.end();
  }

  private dispatchMatMul(
    encoder: GPUCommandEncoder,
    m: number,
    n: number,
    k: number,
    aBuf: GPUBuffer,
    bBuf: GPUBuffer,
    biasBuf: GPUBuffer,
    outputC: GPUBuffer,
    residualBuf?: GPUBuffer,
    addResidual = false,
    activationCode = 0 // 0 = none, 1 = gelu, 2 = relu
  ) {
    if (!this.device) return;

    const mmCfg = this.device.createBuffer({
      size: 20,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint32Array(mmCfg.getMappedRange()).set([
      m,
      n,
      k,
      activationCode,
      addResidual ? 1 : 0
    ]);
    mmCfg.unmap();

    const finalResBuf = residualBuf || this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE });
    const ent = this.pipelines.matmul.getBindGroupLayout(0);
    const bg = this.device.createBindGroup({
      layout: ent,
      entries: [
        { binding: 0, resource: { buffer: mmCfg } },
        { binding: 1, resource: { buffer: aBuf } },
        { binding: 2, resource: { buffer: bBuf } },
        { binding: 3, resource: { buffer: biasBuf } },
        { binding: 4, resource: { buffer: finalResBuf } },
        { binding: 5, resource: { buffer: outputC } }
      ]
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipelines.matmul);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(n / 16), Math.ceil(m / 16));
    pass.end();
  }
}

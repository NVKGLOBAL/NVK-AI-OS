/**
 * Custom WebGPU Shaders (WGSL) for our decoder-only GPT transformer
 * High-performance, memory-efficient compute pipelines.
 */

export const WGSL_SHADERS = {
  // 1. Embedding and Positional Addition WGSL
  embedding: `
    struct Config {
      vocab_size: u32,
      d_model: u32,
      max_seq_len: u32,
      seq_len: u32,
      start_index: u32, // for relative positional offset
    };

    @group(0) @binding(0) var<uniform> cfg: Config;
    @group(0) @binding(1) var<storage, read> tokens: array<u32>;
    @group(0) @binding(2) var<storage, read> w_te: array<f32>;
    @group(0) @binding(3) var<storage, read> w_pe: array<f32>;
    @group(0) @binding(4) var<storage, read_write> output: array<f32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let idx = id.x; // index in the flattened embedding output [seq_len * d_model]
      let total_elements = cfg.seq_len * cfg.d_model;
      if (idx >= total_elements) {
        return;
      }

      let t_idx = idx / cfg.d_model; // which token in the sequence
      let d_idx = idx % cfg.d_model; // feature index in d_model

      let token_id = tokens[t_idx];
      
      // Safety check for token vocabulary limits
      let vocab_id = select(token_id, 0u, token_id >= cfg.vocab_size);

      // Embedded representation
      let te_val = w_te[vocab_id * cfg.d_model + d_idx];

      // Absolute Positional embedding representational mapping
      let abs_pos = cfg.start_index + t_idx;
      let pos_id = select(abs_pos, cfg.max_seq_len - 1u, abs_pos >= cfg.max_seq_len);
      let pe_val = w_pe[pos_id * cfg.d_model + d_idx];

      output[idx] = te_val + pe_val;
    }
  `,

  // 2. Layer Normalization WGSL
  layerNorm: `
    struct LNConfig {
      d_model: u32,
      seq_len: u32,
      eps: f32,
    };

    @group(0) @binding(0) var<uniform> cfg: LNConfig;
    @group(0) @binding(1) var<storage, read> input: array<f32>;
    @group(0) @binding(2) var<storage, read> gamma: array<f32>;
    @group(0) @binding(3) var<storage, read> beta: array<f32>;
    @group(0) @binding(4) var<storage, read_write> output: array<f32>;

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let row = id.x; // row in the token sequence [0..seq_len - 1]
      if (row >= cfg.seq_len) {
        return;
      }

      let start_idx = row * cfg.d_model;

      // 1. Calculate Mean
      var sum: f32 = 0.0;
      for (var i: u32 = 0u; i < cfg.d_model; i = i + 1u) {
        sum = sum + input[start_idx + i];
      }
      let mean = sum / f32(cfg.d_model);

      // 2. Calculate Variance
      var sq_sum: f32 = 0.0;
      for (var i: u32 = 0u; i < cfg.d_model; i = i + 1u) {
        let diff = input[start_idx + i] - mean;
        sq_sum = sq_sum + (diff * diff);
      }
      let variance = sq_sum / f32(cfg.d_model);
      let inv_std = 1.0 / sqrt(variance + cfg.eps);

      // 3. Scale and Shift Output
      for (var i: u32 = 0u; i < cfg.d_model; i = i + 1u) {
        let norm_val = (input[start_idx + i] - mean) * inv_std;
        output[start_idx + i] = norm_val * gamma[i] + beta[i];
      }
    }
  `,

  // 3. High Performance Matrix Multiplication (GEMM) WGSL
  // Computes C = A * B + bias (or plus A for residual), with optional GELU/ReLU
  matmul: `
    struct MMConfig {
      m: u32, // rows of A
      n: u32, // cols of B / cols of C
      k: u32, // cols of A / rows of B
      activation: u32, // 0=None, 1=GELU, 2=ReLU
      add_residual: u32, // 0=None, 1=Adds inputs from C's backup
    };

    @group(0) @binding(0) var<uniform> cfg: MMConfig;
    @group(0) @binding(1) var<storage, read> A: array<f32>;
    @group(0) @binding(2) var<storage, read> B: array<f32>;
    @group(0) @binding(3) var<storage, read> bias: array<f32>;
    @group(0) @binding(4) var<storage, read> residual: array<f32>; // Optional matrix additive
    @group(0) @binding(5) var<storage, read_write> C: array<f32>;

    @compute @workgroup_size(16, 16)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let row = id.y;
      let col = id.x;

      if (row >= cfg.m || col >= cfg.n) {
        return;
      }

      var accumulator: f32 = 0.0;
      for (var i: u32 = 0u; i < cfg.k; i = i + 1u) {
        let a_val = A[row * cfg.k + i];
        let b_val = B[i * cfg.n + col];
        accumulator = accumulator + (a_val * b_val);
      }

      // Add Bias flat mapping value
      accumulator = accumulator + bias[col];

      // Optional Residual Addition (pre-activation skip connections)
      if (cfg.add_residual == 1u) {
        accumulator = accumulator + residual[row * cfg.n + col];
      }

      // Optional Activations
      if (cfg.activation == 1u) {
        // Fast approximation of GELU: 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
        let x = accumulator;
        let c_tanh = tanh(0.797884 * (x + 0.044715 * x * x * x));
        accumulator = 0.5 * x * (1.0 + c_tanh);
      } else if (cfg.activation == 2u) {
        // ReLU Activation
        accumulator = max(accumulator, 0.0);
      }

      C[row * cfg.n + col] = accumulator;
    }
  `,

  // 4. Attention Shaders: Transmit multi-head weights, causal masking, KV loading and caching, softmax, V multiplication.
  // We can write a single, ultra-robust monolithic attention kernel optimized for direct generation
  // input: queries, keys, values -> output: attention contexts.
  attentionUnified: `
    struct AttnConfig {
      seq_len: u32,
      max_seq_len: u32,
      d_model: u32,
      n_heads: u32,
      d_head: u32,
      current_token_idx: u32, // index of current token to write in dynamic KV cache
      is_prefill: u32, // 1 = prefill prompt context, 0 = single autoregressive generation step
    };

    @group(0) @binding(0) var<uniform> cfg: AttnConfig;
    @group(0) @binding(1) var<storage, read> q: array<f32>; // [seq_len, d_model]
    @group(0) @binding(2) var<storage, read_write> k_cache: array<f32>; // [max_seq_len, d_model]
    @group(0) @binding(3) var<storage, read_write> v_cache: array<f32>; // [max_seq_len, d_model]
    @group(0) @binding(4) var<storage, read> k_new: array<f32>; // [seq_len, d_model] - incoming project
    @group(0) @binding(5) var<storage, read> v_new: array<f32>; // [seq_len, d_model] - incoming project
    @group(0) @binding(6) var<storage, read_write> output: array<f32>; // [seq_len, d_model]

    // Shared local memory array to compute intermediate attention weights per thread block
    // Supports up to 512 total context sequences in dummy
    var<workgroup> s_scores: array<f32, 512>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) gid: vec3<u32>,
      @builtin(local_invocation_id) lid: vec3<u32>
    ) {
      let head_idx = gid.y; // head index [0..n_heads - 1]
      let q_token_idx = gid.x; // query token [0..seq_len - 1]

      if (head_idx >= cfg.n_heads || q_token_idx >= cfg.seq_len) {
        return;
      }

      // First, write new K and V weights to correct positions in cache
      let write_offset = select(cfg.current_token_idx + q_token_idx, q_token_idx, cfg.is_prefill == 1u);
      
      if (write_offset < cfg.max_seq_len) {
        // Write K and V slice for this head query
        for (var i: u32 = 0u; i < cfg.d_head; i = i + 1u) {
          let feat_idx = head_idx * cfg.d_head + i;
          let src_idx = q_token_idx * cfg.d_model + feat_idx;
          let dst_idx = write_offset * cfg.d_model + feat_idx;

          k_cache[dst_idx] = k_new[src_idx];
          v_cache[dst_idx] = v_new[src_idx];
        }
      }

      // Total sequence count in cache to attend to
      let total_keys = select(cfg.current_token_idx + 1u, cfg.seq_len, cfg.is_prefill == 1u);
      let scale = 1.0 / sqrt(f32(cfg.d_head));

      // Calculate attention weights between this query and all available keys
      var max_score: f32 = -1e20;
      
      // Step 2a: Query dot Keys
      for (var k_idx: u32 = 0u; k_idx < total_keys; k_idx = k_idx + 1u) {
        // Apply Causal Attention Mask (during prefill mode)
        if (cfg.is_prefill == 1u && k_idx > q_token_idx) {
          s_scores[k_idx] = -1e20;
          continue;
        }

        var dot: f32 = 0.0;
        for (var i: u32 = 0u; i < cfg.d_head; i = i + 1u) {
          let feat_idx = head_idx * cfg.d_head + i;
          let q_val = q[q_token_idx * cfg.d_model + feat_idx];
          let k_val = k_cache[k_idx * cfg.d_model + feat_idx];
          dot = dot + (q_val * k_val);
        }

        let score = dot * scale;
        s_scores[k_idx] = score;
        max_score = max(max_score, score);
      }

      // Step 2b: Softmax normalization in group
      var exp_sum: f32 = 0.0;
      for (var k_idx: u32 = 0u; k_idx < total_keys; k_idx = k_idx + 1u) {
        if (s_scores[k_idx] > -1e19) {
          s_scores[k_idx] = exp(s_scores[k_idx] - max_score);
          exp_sum = exp_sum + s_scores[k_idx];
        } else {
          s_scores[k_idx] = 0.0;
        }
      }

      if (exp_sum > 0.0) {
        for (var k_idx: u32 = 0u; k_idx < total_keys; k_idx = k_idx + 1u) {
          s_scores[k_idx] = s_scores[k_idx] / exp_sum;
        }
      }

      // Step 3: Blend with Value matrix outputs
      for (var i: u32 = 0u; i < cfg.d_head; i = i + 1u) {
        var blended_val: f32 = 0.0;
        let feat_idx = head_idx * cfg.d_head + i;

        for (var k_idx: u32 = 0u; k_idx < total_keys; k_idx = k_idx + 1u) {
          let attn_weight = s_scores[k_idx];
          let v_val = v_cache[k_idx * cfg.d_model + feat_idx];
          blended_val = blended_val + (attn_weight * v_val);
        }

        // Store to global attention outputs
        output[q_token_idx * cfg.d_model + feat_idx] = blended_val;
      }
    }
  `,

  // 5. Softmax/Argmax/Sampling WGSL for the LM Head final logits
  softmaxSampling: `
    struct SoftmaxConfig {
      vocab_size: u32,
      temperature: f32,
    };

    @group(0) @binding(0) var<uniform> cfg: SoftmaxConfig;
    @group(0) @binding(1) var<storage, read> logits: array<f32>; // [vocab_size]
    @group(0) @binding(2) var<storage, read_write> probs: array<f32>; // [vocab_size]

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      // Find the absolute maximum value for robust softmax normalization
      let idx = id.x;
      if (idx >= 1u) { // Let the thread 0 handle the full loop for flat sequence 
        return; 
      }

      var max_val: f32 = -1e20;
      for (var j: u32 = 0u; j < cfg.vocab_size; j = j + 1u) {
        max_val = max(max_val, logits[j]);
      }

      // Calculate exponential sums with temperature scaling
      let temp = max(cfg.temperature, 0.01);
      var sum: f32 = 0.0;
      for (var j: u32 = 0u; j < cfg.vocab_size; j = j + 1u) {
        let val = exp((logits[j] - max_val) / temp);
        probs[j] = val;
        sum = sum + val;
      }

      // Normalize mapping back
      if (sum > 0.0) {
        for (var j: u32 = 0u; j < cfg.vocab_size; j = j + 1u) {
          probs[j] = probs[j] / sum;
        }
      }
    }
  `,
};

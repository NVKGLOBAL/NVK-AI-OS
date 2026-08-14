# Sovereign WebGPU LLMCore – Standalone Training Pipeline

This directory contains the training pipeline and tools to train your own custom, 100% sovereign large language models. The trained weights and tokenizers are serialized into compact flat assets baked directly into the NVK web application, allowing them to run 100% locally on user devices via **WebGPU** compute pipelines with no network traffic or external model dependencies.

---

## 1. Architectural Blueprint & Formulations

The model is a **parametric Decoder-Only Transformer (GPT-style)** optimizing next-token auto-regressive prediction.

### Mathematical Operations

1. **Token Embeddings & Absolute Sinusoidal/Learned Position Embeddings Addition:**
   $$x_t = W_{te}[token_t] + W_{pe}[t]$$

2. **Pre-Layer Normalization & Multi-Head Self-Attention (MHSA) with Causal Masking:**
   $$\text{LayerNorm}(X) = \frac{X - \mu}{\sqrt{\sigma^2 + \epsilon}} \odot \gamma + \beta$$
   $$Q = X \cdot W_q, \quad K = X \cdot W_k, \quad V = X \cdot W_v$$
   $$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{Q K^T}{\sqrt{d_{head}}} + M\right) V$$
   Where $M$ is the causal attention mask:
   $$M_{ij} = \begin{cases} 0 & \text{if } i \geq j \\ -\infty & \text{if } i < j \end{cases}$$

3. **FFN (Feed-Forward network) with Fast GELU Activation:**
   $$\text{MLP}(x) = \text{GELU}(x \cdot W_{fc} + b_{fc}) \cdot W_{proj} + b_{proj}$$
   $$\text{GELU}(z) \approx 0.5 \cdot z \cdot \left(1 + \tanh\left(\sqrt{\frac{2}{\pi}} \left(z + 0.044715 \cdot z^3\right)\right)\right)$$

---

## 2. Installation & Prerequisites

To run the training script offline on your workstation, set up a simple virtual environment:

```bash
# Clone or navigate to the training workspace
cd training/

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install PyTorch and dataset loaders
pip install torch torchvision torchaudio numpy
```

---

## 3. Running the Training Script

The training script `train.py` accepts plaintext files (txt) representing your proprietary, occult, or corporate knowledge graph base and outputs ready-to-bundle weight packs.

### Quick Dummy Training (Default Core)
If no external text file is pointed to, the script will automatically initialize self-contained Codex Lore data:
```bash
python train.py --epochs 10 --batch_size 8 --max_seq_len 128
```

### Full Custom Training
To train with your own documents:
```bash
python train.py \
  --corpus path/to/your_proprietary_data.txt \
  --epochs 20 \
  --batch_size 16 \
  --vocab_size 1200 \
  --max_seq_len 256 \
  --output_dir ./exports
```

---

## 4. Binary Output Format Specifications

The `.bin` weight pack produced by `train.py` is a contiguous, non-padded, packed array of IEEE 754 float32 values (4 bytes each). At loading time, the client-side WebGPU engine parses this file by slicing it sequentially into subword tensor layers. This matches:

| Offset Sequence # | Variable Name | Dimensions / Shape | Element Count | Size on Disk (at floats) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `w_te` | `[vocab_size, d_model]` | `vocab_size * d_model` | `4 * (vocab_size * dModel)` |
| **2** | `w_pe` | `[max_seq_len, d_model]` | `max_seq_len * d_model` | `4 * (max_seq_len * dModel)` |
| **3** | `ln_1_weights` / `biases` | `[d_model]` each | `d_model * 2` per block | `8 * dModel` per block |
| **4** | `w_q`, `w_k`, `w_v`, `w_proj` | `[d_model, d_model]` each | `d_model * d_model * 4` per block | `16 * (dModel * dModel)` per block |
| **5** | Attention biases (`b_q`, `b_k`, `b_v`, `b_proj`) | `[d_model]` each | `d_model * 4` per block | `16 * dModel` per block |
| **6** | `ln_2_weights` / `biases` | `[d_model]` each | `d_model * 2` per block | `8 * dModel` per block |
| **7** | `w_fc` / `b_fc` (FF1 Layer) | `[d_model, d_ff]` / `[d_ff]` | `d_model * d_ff + d_ff` per block | `4 * (dModel * dFF + dFF)` |
| **8** | `w_fc_proj` / `b_fc_proj` (FF2 Layer)| `[d_ff, d_model]` / `[d_model]` | `d_ff * d_model + d_model` per block| `4 * (dFF * dModel + dModel)` |
| **9** | `ln_f_weights` / `biases` | `[d_model]` each | `d_model * 2` | `8 * d_model` |
| **10** | `w_lm_head` | `[vocab_size, d_model]` | `vocab_size * d_model` | `4 * (vocab_size * dModel)` |

### Integration Guidelines

Simply copy the produced assets from your workstation into your applet structure:
- Copy `exports/tokenizer.json` to `/public/assets/tokenizer.json`
- Copy `exports/model.bin` to `/public/assets/model.bin`

When initialized on a WebGPU-enabled client (e.g. Google Chrome), the model will compile WGSL shaders and bind these weights instantaneously, delivering real-time streaming tokens entirely on the client thread.

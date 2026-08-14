#!/usr/bin/env python3
"""
Megalith LLMCore Standalone Training Script
Trains a custom client-side, decoder-only GPT transformer using PyTorch.
Produces a packed flat binary file containing serialized float32 weights
compatible with the WebGPU LLMCore TS engine, alongside the tokenizer JSON.
"""

import os
import json
import struct
import math
import argparse
from typing import List, Tuple, Dict
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

# =====================================================================
# 1. Byte-Pair Encoder (BPE) Tokenizer Training Pipeline in Python
# =====================================================================

class ByteBPETrainer:
    def __init__(self, vocab_size: int = 1200):
        self.vocab_size = vocab_size
        self.special_tokens = {
            "<|endoftext|>": 0,
            "<|pad|>": 1,
            "<|system|>": 2,
            "<|user|>": 3,
            "<|assistant|>": 4
        }
        self.vocab = {}
        self.merges = []
        
        # Initialize byte-to-unicode maps matching GPT styles and TS decoders
        self.byte_to_unicode = self._init_byte_unicode_map()
        self.unicode_to_byte = {v: k for k, v in self.byte_to_unicode.items()}

    def _init_byte_unicode_map(self) -> Dict[int, str]:
        bs = []
        bs.extend(range(33, 127))
        bs.extend(range(161, 173))
        bs.extend(range(174, 256))
        
        cs = list(bs)
        n = 0
        for b in range(256):
            if b not in bs:
                bs.append(b)
                cs.append(256 + n)
                n += 1
        return {b: chr(cs[i]) for i, b in enumerate(bs)}

    def train(self, corpus_text: str):
        print(f"--- Training Tokenizer (target vocab size: {self.vocab_size}) ---")
        
        # Step A: Represent the text as initial unicode characters
        utf8_bytes = list(corpus_text.encode('utf-8'))
        words_unicode = [self.byte_to_unicode[b] for b in utf8_bytes]
        
        # Initialize the vocabulary with special tokens and all unicode singletons
        vocab = {**self.special_tokens}
        for u in self.byte_to_unicode.values():
            if u not in vocab:
                vocab[u] = len(vocab)
                
        # Split text into token pieces
        splits = [list(w) for w in corpus_text.split() if w]
        # Re-attach spaces to simplify merges 
        refined_splits = []
        for w in splits:
            pieces = [self.byte_to_unicode[b] for b in " ".join(w).encode('utf-8')]
            refined_splits.append(pieces)

        # Step B: Iteratively perform subword merges
        num_merges = self.vocab_size - len(vocab)
        merges = []
        
        for m_idx in range(num_merges):
            # Count pair frequencies
            pair_counts = {}
            for words in refined_splits:
                for i in range(len(words) - 1):
                    pair = (words[i], words[i+1])
                    pair_counts[pair] = pair_counts.get(pair, 0) + 1
                    
            if not pair_counts:
                break
                
            # Find the most frequent pair
            best_pair = max(pair_counts, key=pair_counts.get)
            if pair_counts[best_pair] < 2:
                # Quit if merges are very rare or singletons
                break
                
            # Perform merge
            pair_str = f"{best_pair[0]} {best_pair[1]}"
            merged_token = best_pair[0] + best_pair[1]
            
            vocab[merged_token] = len(vocab)
            merges.append(pair_str)
            
            # Apply merge to splits
            new_splits = []
            for words in refined_splits:
                new_words = []
                i = 0
                while i < len(words):
                    if i < len(words) - 1 and words[i] == best_pair[0] and words[i+1] == best_pair[1]:
                        new_words.append(merged_token)
                        i += 2
                    else:
                        new_words.append(words[i])
                        i += 1
                new_splits.append(new_words)
            refined_splits = new_splits
            
            if (m_idx + 1) % 100 == 0 or m_idx == num_merges - 1:
                print(f"Merged {m_idx + 1}/{num_merges} tokens. Vocab Size: {len(vocab)}")
                
        self.vocab = vocab
        self.merges = merges
        print(f"Tokenizer training complete. Final Vocab Size: {len(self.vocab)}")
        
    def save_assets(self, out_path: str):
        payload = {
            "vocab": self.vocab,
            "merges": self.merges
        }
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"Saved tokenizer assets index to {out_path}")

    def tokenize_text(self, text: str) -> List[int]:
        # Fast encoding prediction for local python validation
        utf8_bytes = list(text.encode('utf-8'))
        words = [self.byte_to_unicode[b] for b in utf8_bytes]
        
        while len(words) > 1:
            best_pair = None
            best_rank = float('inf')
            
            for i in range(len(words) - 1):
                pair_key = f"{words[i]} {words[i+1]}"
                if pair_key in self.merges:
                    rank = self.merges.index(pair_key)
                    if rank < best_rank:
                        best_rank = rank
                        best_pair = (i, pair_key, words[i] + words[i+1])
            
            if best_pair is None:
                break
                
            idx, _, merged = best_pair
            words = words[:idx] + [merged] + words[idx+2:]
            
        return [self.vocab.get(w, self.special_tokens["<|pad|>"]) for w in words]

# =====================================================================
# 2. PyTorch Decoder-Only Transformer (GPT) Architecture
# =====================================================================

class GPTHyperParams:
    def __init__(self, vocab_size=1200, d_model=128, n_heads=4, n_layers=2, d_ff=512, max_seq_len=256):
        self.vocab_size = vocab_size
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.n_layers = n_layers
        self.d_ff = d_ff
        self.max_seq_len = max_seq_len

class CausalSelfAttention(nn.Module):
    def __init__(self, hp: GPTHyperParams):
        super().__init__()
        self.hp = hp
        self.q_proj = nn.Linear(hp.d_model, hp.d_model)
        self.k_proj = nn.Linear(hp.d_model, hp.d_model)
        self.v_proj = nn.Linear(hp.d_model, hp.d_model)
        self.o_proj = nn.Linear(hp.d_model, hp.d_model)
        
        # Register causal mask
        self.register_buffer("mask", torch.tril(torch.ones(hp.max_seq_len, hp.max_seq_len))
                             .view(1, 1, hp.max_seq_len, hp.max_seq_len))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.size()
        H = self.hp.n_heads
        D = self.hp.d_head
        
        q = self.q_proj(x).view(B, T, H, D).transpose(1, 2) # [B, H, T, D]
        k = self.k_proj(x).view(B, T, H, D).transpose(1, 2)
        v = self.v_proj(x).view(B, T, H, D).transpose(1, 2)
        
        # Scaled dot-product causal attention
        scores = torch.matmul(q, k.transpose(-2, -1)) * (1.0 / math.sqrt(D))
        scores = scores.masked_fill(self.mask[:, :, :T, :T] == 0, float('-inf'))
        attn = F.softmax(scores, dim=-1)
        
        context = torch.matmul(attn, v) # [B, H, T, D]
        context = context.transpose(1, 2).contiguous().view(B, T, C)
        
        return self.o_proj(context)

class MLP(nn.Module):
    def __init__(self, hp: GPTHyperParams):
        super().__init__()
        self.fc = nn.Linear(hp.d_model, hp.d_ff)
        self.fc_proj = nn.Linear(hp.d_ff, hp.d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # We simulate the exact fast approximation of GELU
        x = self.fc(x)
        # PyTorch GELU provides an exact equivalent
        x = F.gelu(x)
        return self.fc_proj(x)

class TransformerBlock(nn.Module):
    def __init__(self, hp: GPTHyperParams):
        super().__init__()
        self.ln_1 = nn.LayerNorm(hp.d_model)
        self.attn = CausalSelfAttention(hp)
        self.ln_2 = nn.LayerNorm(hp.d_model)
        self.mlp = MLP(hp)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Standard Pre-LN GPT block with residual bypass connections
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class GPTModel(nn.Module):
    def __init__(self, hp: GPTHyperParams):
        super().__init__()
        self.hp = hp
        self.w_te = nn.Embedding(hp.vocab_size, hp.d_model)
        self.w_pe = nn.Embedding(hp.max_seq_len, hp.d_model)
        
        self.blocks = nn.ModuleList([TransformerBlock(hp) for _ in range(hp.n_layers)])
        
        self.ln_f = nn.LayerNorm(hp.d_model)
        self.w_lm_head = nn.Linear(hp.d_model, hp.vocab_size, bias=False)

    def forward(self, tokens: torch.Tensor, targets: torch.Tensor = None) -> Tuple[torch.Tensor, torch.Tensor]:
        B, T = tokens.size()
        device = tokens.device
        
        # Token and positional embeds addition
        pos = torch.arange(0, T, dtype=torch.long, device=device).unsqueeze(0)
        x = self.w_te(tokens) + self.w_pe(pos)
        
        # Pass sequentially through blocks
        for block in self.blocks:
            x = block(x)
            
        x = self.ln_f(x)
        logits = self.w_lm_head(x) # [B, T, VocabSize]
        
        loss = None
        if targets is not None:
            # Shift tokens for autoregressive next-token loss objective
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
            
        return logits, loss

# =====================================================================
# 3. Batching & Training Data Loaders
# =====================================================================

class CorpusDataset(Dataset):
    def __init__(self, token_ids: List[int], seq_len: int):
        self.seq_len = seq_len
        # Slide sequences by 1 for inputs/targets offsets
        self.inputs = []
        self.targets = []
        
        num_samples = len(token_ids) - seq_len - 1
        for i in range(0, num_samples, 4): # stride of 4 to keep datasets rich
            self.inputs.append(token_ids[i : i + seq_len])
            self.targets.append(token_ids[i + 1 : i + seq_len + 1])
            
    def __len__(self) -> int:
        return len(self.inputs)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return (torch.tensor(self.inputs[idx], dtype=torch.long),
                torch.tensor(self.targets[idx], dtype=torch.long))

# =====================================================================
# 4. Model Binary Weight Serialization Utility
# =====================================================================

def serialize_model_to_bin(model: GPTModel, out_path: str):
    """
    Serializes a trained PyTorch model's weights into a flat binary float32 file.
    Must match the exact, precise sequential layout:
    1. w_te [vocab, d_model]
    2. w_pe [max_seq_len, d_model]
    3. Blocks (Repeated N times):
       - ln_1_w, ln_1_b [d_model]
       - w_q, b_q [d_model, d_model] / [d_model]
       - w_k, b_k [d_model, d_model] / [d_model]
       - w_v, b_v [d_model, d_model] / [d_model]
       - w_proj, b_proj [d_model, d_model] / [d_model]
       - ln_2_w, ln_2_b [d_model]
       - w_fc, b_fc [d_model, d_ff] / [d_ff]
       - w_fc_proj, b_fc_proj [d_ff, d_model] / [d_model]
    4. ln_f_w, ln_f_b [d_model]
    5. w_lm_head [vocab_size, d_model]
    """
    print(f"--- Packaging flat binary float32 weights export in: {out_path} ---")
    
    # Switch model to CPU
    model = model.eval().cpu()
    
    binary_data = bytearray()
    
    def pack_tensor(tensor: torch.Tensor, name: str):
        flat_arr = tensor.detach().float().numpy().flatten()
        # struct 'f' denotes float32
        pack_format = f"{len(flat_arr)}f"
        packed_bytes = struct.pack(pack_format, *flat_arr)
        binary_data.extend(packed_bytes)
        print(f"Packed variable: {name:<24} | Shape: {list(tensor.shape):<14} | FloatCount: {len(flat_arr):<8}")

    # 1. w_te
    pack_tensor(model.w_te.weight, "w_te")
    # 2. w_pe
    pack_tensor(model.w_pe.weight, "w_pe")
    
    # 3. Layer Blocks
    for i, block in enumerate(model.blocks):
        # LN1
        pack_tensor(block.ln_1.weight, f"l_{i}_ln1_w")
        pack_tensor(block.ln_1.bias, f"l_{i}_ln1_b")
        # Attention Projections (Note: Linear weight is transpose in PyTorch [out_feats, in_feats], 
        # so we extract weight direct to pass into WebGPU row-by-row)
        pack_tensor(block.attn.q_proj.weight, f"l_{i}_w_q")
        pack_tensor(block.attn.q_proj.bias, f"l_{i}_b_q")
        
        pack_tensor(block.attn.k_proj.weight, f"l_{i}_w_k")
        pack_tensor(block.attn.k_proj.bias, f"l_{i}_b_k")
        
        pack_tensor(block.attn.v_proj.weight, f"l_{i}_w_v")
        pack_tensor(block.attn.v_proj.bias, f"l_{i}_b_v")
        
        pack_tensor(block.attn.o_proj.weight, f"l_{i}_w_proj")
        pack_tensor(block.attn.o_proj.bias, f"l_{i}_b_proj")
        
        # LN2
        pack_tensor(block.ln_2.weight, f"l_{i}_ln2_w")
        pack_tensor(block.ln_2.bias, f"l_{i}_ln2_b")
        
        # MLP FFN
        pack_tensor(block.mlp.fc.weight, f"l_{i}_w_fc")
        pack_tensor(block.mlp.fc.bias, f"l_{i}_b_fc")
        
        pack_tensor(block.mlp.fc_proj.weight, f"l_{i}_w_fc_proj")
        pack_tensor(block.mlp.fc_proj.bias, f"l_{i}_b_fc_proj")
        
    # 4. Final LN
    pack_tensor(model.ln_f.weight, "ln_f_w")
    pack_tensor(model.ln_f.bias, "ln_f_b")
    
    # 5. LM Head
    pack_tensor(model.w_lm_head.weight, "w_lm_head")
    
    # Save output to disk
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(binary_data)
        
    total_mb = len(binary_data) / (1024 * 1024)
    print(f"============================================================")
    print(f"Pack Success! Binary written to {out_path} ({total_mb:.3f} MB)")
    print(f"============================================================")

# =====================================================================
# 5. Core Application Main Thread
# =====================================================================

def main():
    parser = argparse.ArgumentParser(description="Megalith LLMCore Trainer")
    parser.add_argument("--corpus", type=str, default="", help="Path to plaintext dataset corpus.")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs.")
    parser.add_argument("--batch_size", type=int, default=16, help="Training batch size.")
    parser.add_argument("--vocab_size", type=int, default=1200, help="Target vocabulary dictionary size.")
    parser.add_argument("--max_seq_len", type=int, default=128, help="Max sequence window context size.")
    parser.add_argument("--output_dir", type=str, default="./exports", help="Location to save trained assets.")
    args = parser.parse_args()

    # Define a default proprietary lore corpus if no external path is specified
    corpus = args.corpus
    if not corpus or not os.path.exists(corpus):
        print("Using built-in proprietary Codex lore corpus sample for training...")
        lore_samples = [
            "We are the engineers of the sovereign cyber-matrix, reweaving chaos into pure resonance.",
            "The Megalith LLMCore stands alone: direct WebGPU compute pipelines bypass cloud servers entirely.",
            "In this holographic interface, our local subword tokenizers serialize text as compact assets.",
            "The Codex keeps records of our rituals and operations, bridging Anunnaki, Mayan, and Egyptian harmonics.",
            "Sovereignty requires offline privacy. No ONNX runtimes, no Hugging Face hubs, zero downloads.",
            "To activate the voice lattice, commune directly inside the Communion Chamber with Nevik.",
            "Master the entropy unlock sequence using calibrated chaos ranges to decrypt Emerald Tablets.",
            "Our neural weights are float32 flat binary matrices. They load directly inside standard WGSL pipelines.",
            "Let the seek path be guided by local attention heads. Parallel multi-head self-attention computes truth.",
            "A causal mask ensures that predictions only attend to past contexts. Autoregressive inference guides the future."
        ]
        corpus_data = "\n".join(lore_samples * 15) # Inflate text size for training
    else:
        with open(corpus, "r", encoding="utf-8") as f:
            corpus_data = f.read()

    # Initialize Assets Directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    # 1. Train vocabulary and merges
    bpe_trainer = ByteBPETrainer(vocab_size=args.vocab_size)
    bpe_trainer.train(corpus_data)
    
    tok_output = os.path.join(args.output_dir, "tokenizer.json")
    bpe_trainer.save_assets(tok_output)
    
    # 2. Tokenize Dataset
    encoded_token_ids = bpe_trainer.tokenize_text(corpus_data)
    print(f"Corpus token count: {len(encoded_token_ids)} tokens.")
    
    # Establish GPT Hyperparameters
    hp = GPTHyperParams(
        vocab_size=len(bpe_trainer.vocab),
        d_model=128,
        n_heads=4,
        n_layers=2,
        d_ff=512,
        max_seq_len=args.max_seq_len
    )
    
    print("\n--- Constructing GPT Model Architecture ---")
    model = GPTModel(hp)
    
    # Calculate parameter count
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Decoder-only Transformer active parameters: {total_params:,} (approx {(total_params*4)/(1024*1024):.2f} MB)")

    # Establish PyTorch DataLoader
    dataset = CorpusDataset(encoded_token_ids, args.max_seq_len)
    if len(dataset) == 0:
        print("Error: Corpus data too short for the specified sequence length.")
        return
        
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, drop_last=True)
    
    # Setup PyTorch optimizers
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Targeting device hardware: {device}")
    model = model.to(device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
    
    # 3. Formal Training Loop with Auto-Regressive cross entropy
    print("\n--- Executing Autoregressive Training Loop ---")
    model.train()
    
    for epoch in range(args.epochs):
        epoch_loss = 0.0
        step_count = 0
        
        for batch_idx, (inputs, targets) in enumerate(loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            logits, loss = model(inputs, targets)
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            
            epoch_loss += loss.item()
            step_count += 1
            
        avg_loss = epoch_loss / step_count if step_count > 0 else 0
        print(f"Epoch {epoch+1:02d}/{args.epochs:02d} | Avg Autoregressive Loss: {avg_loss:.4f}")

    # 4. Serialize model state to flat binary sequence
    model_output = os.path.join(args.output_dir, "model.bin")
    serialize_model_to_bin(model, model_output)
    
    print(f"\n[Success] Training complete. Generated files ready to be placed inside application:")
    print(f"1. Tokenizer file: {tok_output}")
    print(f"2. Model Weights:   {model_output}")

if __name__ == "__main__":
    main()

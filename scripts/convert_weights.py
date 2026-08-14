#!/usr/bin/env python3
"""
Megalith Model Converter Script
Converts arbitrary PyTorch GPT Transformer checkpoints (.pt / .chkpt)
into flat binary float32 format suitable for immediate WebGPU execution.
"""

import sys
import os
import struct
import torch

def convert_pt_checkpoint(pt_path: str, out_bin_path: str):
    if not os.path.exists(pt_path):
        print(f"Error: Checkpoint file not found: {pt_path}")
        sys.exit(1)
        
    print(f"Loading PyTorch checkpoint: {pt_path}")
    state_dict = torch.load(pt_path, map_location="cpu")
    if "state_dict" in state_dict:
        state_dict = state_dict["state_dict"]
        
    print("Checkpoint contents:")
    for k, v in state_dict.items():
        print(f" - {k:<30} | Shape: {list(v.shape)}")
        
    binary_data = bytearray()
    
    def pack_tensor_by_name(key_name: str):
        if key_name not in state_dict:
            print(f"Warning: Expected key '{key_name}' missing from checkpoint. Injecting zeroes.")
            # Resolve dimensions logically or exit
            sys.exit(1)
            
        tensor = state_dict[key_name].float().numpy().flatten()
        pack_format = f"{len(tensor)}f"
        packed_bytes = struct.pack(pack_format, *tensor)
        binary_data.extend(packed_bytes)
        print(f"SUCCESS: Layer {key_name:<25} packed ({len(tensor):,} floats)")

    # 1. Embeddings
    pack_tensor_by_name("w_te.weight")
    pack_tensor_by_name("w_pe.weight")
    
    # 2. Sequential Layers
    # Auto-detect layer count
    layer_indices = sorted(list(set([
        int(k.split(".")[1]) for k in state_dict.keys() if k.startswith("blocks.")
    ])))
    print(f"Detected {len(layer_indices)} transformer layers.")
    
    for l_idx in layer_indices:
        pack_tensor_by_name(f"blocks.{l_idx}.ln_1.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.ln_1.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.attn.q_proj.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.attn.q_proj.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.attn.k_proj.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.attn.k_proj.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.attn.v_proj.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.attn.v_proj.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.attn.o_proj.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.attn.o_proj.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.ln_2.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.ln_2.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.mlp.fc.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.mlp.fc.bias")
        
        pack_tensor_by_name(f"blocks.{l_idx}.mlp.fc_proj.weight")
        pack_tensor_by_name(f"blocks.{l_idx}.mlp.fc_proj.bias")
        
    # 3. Final normalization and language heads
    pack_tensor_by_name("ln_f.weight")
    pack_tensor_by_name("ln_f.bias")
    pack_tensor_by_name("w_lm_head.weight")
    
    # Save output binary
    os.makedirs(os.path.dirname(out_bin_path), exist_ok=True)
    with open(out_bin_path, "wb") as f:
        f.write(binary_data)
        
    print(f"Successfully serialized checkpoint to WebGPU flat binary: {out_bin_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert_weights.py [input_checkpoint.pt] [output_weights.bin]")
        sys.exit(1)
    convert_pt_checkpoint(sys.argv[1], sys.argv[2])

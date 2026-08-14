/**
 * Plain TypeScript Custom Byte-Level BPE Tokenizer
 * Fully self-contained. No external dependencies.
 * Maps string prompts to lists of vocabluary token IDs and vice versa.
 */

export interface TokenizerConfig {
  vocab: Record<string, number>;
  merges: string[];
}

export class ByteBPEWithSpecialTokens {
  private vocab: Map<string, number> = new Map();
  private invVocab: Map<number, string> = new Map();
  private merges: Map<string, number> = new Map(); // "tokenA tokenB" -> precedence index
  private byteToUnicode: Map<number, string> = new Map();
  private unicodeToByte: Map<string, number> = new Map();
  
  // Special tokens mapping
  public specialTokens: Record<string, number> = {
    "<|endoftext|>": 0,
    "<|pad|>": 1,
    "<|system|>": 2,
    "<|user|>": 3,
    "<|assistant|>": 4,
  };

  constructor(config?: TokenizerConfig) {
    this.initByteUnicodeMaps();
    
    // Register special tokens in vocab
    Object.entries(this.specialTokens).forEach(([tok, id]) => {
      this.vocab.set(tok, id);
      this.invVocab.set(id, tok);
    });

    if (config) {
      this.loadConfig(config);
    } else {
      this.generateFallbackConfig();
    }
  }

  private initByteUnicodeMaps() {
    // Generate a clean mapping of bytes 0..255 to unique unicode characters to prevent weird spacing/invalid splits
    let bs: number[] = [];
    const pushRange = (start: number, end: number) => {
      for (let i = start; i <= end; i++) bs.push(i);
    };
    pushRange(33, 126);
    pushRange(161, 172);
    pushRange(174, 255);

    let cs = [...bs];
    let n = 0;
    for (let b = 0; b < 256; b++) {
      if (!bs.includes(b)) {
        bs.push(b);
        cs.push(256 + n);
        n++;
      }
    }

    for (let i = 0; i < 256; i++) {
      const char = String.fromCharCode(cs[i]);
      this.byteToUnicode.set(bs[i], char);
      this.unicodeToByte.set(char, bs[i]);
    }
  }

  private loadConfig(config: TokenizerConfig) {
    // Load vocabulary
    Object.entries(config.vocab).forEach(([tok, id]) => {
      this.vocab.set(tok, id);
      this.invVocab.set(id, tok);
    });

    // Load merge rules
    config.merges.forEach((mergeStr, idx) => {
      this.merges.set(mergeStr, idx);
    });
  }

  private generateFallbackConfig() {
    // Dynamically register fallback basic character set and simple common words
    let idCounter = 5; // Start after special tokens
    
    // Add raw BPE byte unicodes
    this.byteToUnicode.forEach((unicodeChar) => {
      if (!this.vocab.has(unicodeChar)) {
        this.vocab.set(unicodeChar, idCounter);
        this.invVocab.set(idCounter, unicodeChar);
        idCounter++;
      }
    });

    // Add common subword tokens as merges
    const fallbackMerges = [
      "t h", "e r", "i n", "a n", "r e", "o n", "a t", "e n", "e s", "o u", 
      "th e", "th at", "an d", "i s", "i t", "o f", "t o", "y ou", "w ith",
      "h e", "sh e", "w e", "th ey", "th is", "f or", "a s", "a r", "o r", "th e r"
    ];

    fallbackMerges.forEach((merge) => {
      const mergedToken = merge.replace(/\s+/g, '');
      if (!this.vocab.has(mergedToken)) {
        this.vocab.set(mergedToken, idCounter);
        this.invVocab.set(idCounter, mergedToken);
        idCounter++;
      }
      this.merges.set(merge, idCounter);
    });
  }

  /**
   * Encodes a standard text string into a list of vocabulary token IDs.
   */
  public encode(text: string): number[] {
    if (!text) return [];

    // Parse and handle special tokens (if present)
    const specialRegex = /<\|endoftext\|>|<\|pad\|>|<\|system\|>|<\|user\|>|<\|assistant\|>/g;
    const pieces: { text: string; isSpecial: boolean }[] = [];
    
    let lastIdx = 0;
    let match;
    while ((match = specialRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        pieces.push({ text: text.substring(lastIdx, match.index), isSpecial: false });
      }
      pieces.push({ text: match[0], isSpecial: true });
      lastIdx = specialRegex.lastIndex;
    }
    if (lastIdx < text.length) {
      pieces.push({ text: text.substring(lastIdx), isSpecial: false });
    }

    const tokens: number[] = [];
    for (const piece of pieces) {
      if (piece.isSpecial) {
        tokens.push(this.specialTokens[piece.text]);
        continue;
      }
      
      // Standard sub-tokens byte encoding
      const utf8Bytes = Array.from(new TextEncoder().encode(piece.text));
      let words = utf8Bytes.map(b => this.byteToUnicode.get(b) || '');
      
      // Apply merge rules iteratively
      while (words.length > 1) {
        let bestMerge: string | null = null;
        let lowestRank = Infinity;
        let bestIdx = -1;

        for (let i = 0; i < words.length - 1; i++) {
          const pairKey = `${words[i]} ${words[i + 1]}`;
          const rank = this.merges.get(pairKey);
          if (rank !== undefined && rank < lowestRank) {
            lowestRank = rank;
            bestMerge = pairKey;
            bestIdx = i;
          }
        }

        if (bestMerge === null || bestIdx === -1) {
          break; // No further merge rules apply
        }

        const mergedPiece = words[bestIdx] + words[bestIdx + 1];
        words.splice(bestIdx, 2, mergedPiece);
      }

      // Convert word tokens to vocab IDs
      for (const w of words) {
        const id = this.vocab.get(w);
        if (id !== undefined) {
          tokens.push(id);
        } else {
          // Token is missing, decode back character bytes or assign pad/unk
          for (let i = 0; i < w.length; i++) {
            const ch = w[i];
            const fallbackId = this.vocab.get(ch);
            if (fallbackId !== undefined) {
              tokens.push(fallbackId);
            } else {
              tokens.push(this.vocab.get(" ") || 1); // fallback to Space or Pad
            }
          }
        }
      }
    }

    return tokens;
  }

  /**
   * Decodes a list of vocabulary token IDs back into standard text.
   */
  public decode(tokenIds: number[]): string {
    let result = "";
    
    for (const id of tokenIds) {
      if (id === undefined || id === null) continue;
      
      // Check special tokens
      let isSpecial = false;
      for (const [tok, spId] of Object.entries(this.specialTokens)) {
        if (spId === id) {
          result += tok;
          isSpecial = true;
          break;
        }
      }
      if (isSpecial) continue;

      const tokenStr = this.invVocab.get(id);
      if (!tokenStr) continue;

      // Unpack bytes mapped to unicode
      const bytes: number[] = [];
      for (let i = 0; i < tokenStr.length; i++) {
        const char = tokenStr[i];
        const b = this.unicodeToByte.get(char);
        if (b !== undefined) {
          bytes.push(b);
        } else {
          // Keep raw characters if they aren't part of the unicode map
          const unicodeFallback = char.charCodeAt(0);
          bytes.push(unicodeFallback & 0xff);
        }
      }
      
      result += new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    }

    return result;
  }

  public getVocabSize(): number {
    return this.vocab.size;
  }

  public getVocab(): Record<string, number> {
    const obj: Record<string, number> = {};
    this.vocab.forEach((id, text) => {
      obj[text] = id;
    });
    return obj;
  }

  public getMergesList(): string[] {
    const list: string[] = new Array(this.merges.size);
    this.merges.forEach((rank, pair) => {
      list[rank] = pair;
    });
    return list.filter(x => x !== undefined);
  }
}

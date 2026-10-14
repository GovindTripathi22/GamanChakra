# Chakra-Nano — model card

Custom small language model trained **from scratch** inside this repository (no external API, no pretrained weights).

| | |
|---|---|
| Architecture | Multi-task fastText-style network: hashed word/bigram/char-trigram + domain-lexicon features → EmbeddingBag (16384 × 32) → 3 softmax heads |
| Heads | voice-command **intent** (21 classes) · news **category** (12 classes) · news **severity** (4 classes) |
| Parameters | 525,472 (int8-quantised, per-row scales) |
| Weights file | `src/lib/slm/weights/chakra-nano.json` (780 KB) |
| Training examples | 4,658 (template-expanded + hand-written, entity-masked) |
| Epochs / final loss | 18 / 0.0136 |
| Train time | 3.1 s on CPU |
| Inference | < 1 ms per sentence on a laptop CPU, runs in Node or the browser |

## Blind evaluation (84 sentences never seen in training or tuning)

| Metric | Score |
|---|---|
| Voice intent accuracy | **96.4%** |
| News category accuracy (12-way) | **82.1%** |
| Travel-relevant vs not | **94.6%** |
| Severity within one level | **96.4%** |

Severity is further corrected at runtime by numeric rules (earthquake magnitude, casualty counts, alert colours,
"state of emergency", etc.) in `src/lib/slm/severity.ts`.

## Limitations
- English, Hinglish and basic Hindi (Devanagari). Other languages fall back to the place/lexicon signals.
- Confusions are mostly between neighbouring classes (e.g. severe weather vs natural disaster, strike vs transport).
- Retrain any time with `npm run slm:train` after adding examples to `src/lib/slm/corpus/`.

Trained 2026-10-13T06:32:32.424Z.

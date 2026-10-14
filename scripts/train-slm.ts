/**
 * Train Chakra-Nano from scratch and write the quantised weights + model card.
 *   npm run slm:train
 */
import fs from "node:fs";
import path from "node:path";
import { trainChakraNano } from "../src/lib/slm/train";

const t0 = Date.now();
const { serialized, report } = trainChakraNano({ includeDevSet: true, log: (s) => process.stdout.write(`\r${s}   `) });
process.stdout.write("\n");
const out = path.join(process.cwd(), "src/lib/slm/weights/chakra-nano.json");
fs.writeFileSync(out, JSON.stringify(serialized));
const kb = Math.round(fs.statSync(out).size / 1024);
const b = report.blind;
const card = `# Chakra-Nano — model card

Custom small language model trained **from scratch** inside this repository (no external API, no pretrained weights).

| | |
|---|---|
| Architecture | Multi-task fastText-style network: hashed word/bigram/char-trigram + domain-lexicon features → EmbeddingBag (${serialized.buckets} × ${serialized.dim}) → 3 softmax heads |
| Heads | voice-command **intent** (21 classes) · news **category** (12 classes) · news **severity** (4 classes) |
| Parameters | ${report.params.toLocaleString()} (int8-quantised, per-row scales) |
| Weights file | \`src/lib/slm/weights/chakra-nano.json\` (${kb} KB) |
| Training examples | ${report.examples.toLocaleString()} (template-expanded + hand-written, entity-masked) |
| Epochs / final loss | ${report.epochs} / ${report.finalLoss} |
| Train time | ${((Date.now() - t0) / 1000).toFixed(1)} s on CPU |
| Inference | < 1 ms per sentence on a laptop CPU, runs in Node or the browser |

## Blind evaluation (${b.n} sentences never seen in training or tuning)

| Metric | Score |
|---|---|
| Voice intent accuracy | **${(b.intentAccuracy * 100).toFixed(1)}%** |
| News category accuracy (12-way) | **${(b.categoryAccuracy * 100).toFixed(1)}%** |
| Travel-relevant vs not | **${(b.travelRelevanceAccuracy * 100).toFixed(1)}%** |
| Severity within one level | **${(b.severityWithinOne * 100).toFixed(1)}%** |

Severity is further corrected at runtime by numeric rules (earthquake magnitude, casualty counts, alert colours,
"state of emergency", etc.) in \`src/lib/slm/severity.ts\`.

## Limitations
- English, Hinglish and basic Hindi (Devanagari). Other languages fall back to the place/lexicon signals.
- Confusions are mostly between neighbouring classes (e.g. severe weather vs natural disaster, strike vs transport).
- Retrain any time with \`npm run slm:train\` after adding examples to \`src/lib/slm/corpus/\`.

Trained ${report.trainedAt}.
`;
fs.writeFileSync(path.join(process.cwd(), "slm/MODEL_CARD.md"), card);
console.log(`Saved ${out} (${kb} KB)`);
console.log("Blind eval:", b);

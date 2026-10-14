# GamanChakra SLM — two tiers, zero API keys

## Tier 1 · Chakra-Nano (always on, in this repo)
A small language model **trained from scratch** for travel-risk understanding. Code: `src/lib/slm/`. Weights: `src/lib/slm/weights/chakra-nano.json`. Card: [`MODEL_CARD.md`](MODEL_CARD.md).

- **Tasks:** voice-command intent (21) · news category (12) · severity (4) + slot filling + gazetteer NER.
- **Retrain:** add examples to `src/lib/slm/corpus/*.ts`, then `npm run slm:train` (~3 s on a laptop). The script prints and stores **blind-set** metrics; `npm test` fails if quality drops below the gates.
- **Held-out sets:** `eval-set.ts` has a dev set (also used for the final fit) and a **blind** set that is never trained on — that is what we report.
- **Try it:** `/risk` → “Chakra-Nano playground”, or `POST /api/slm {"text": "...", "task": "news" | "intent"}`.

## Tier 2 · Generative Chakra (optional, local)
A 1–3 B open model running on your machine via [Ollama](https://ollama.com). Used to *phrase* advisories, briefings and itinerary themes — never to decide or invent facts.

```bash
ollama pull qwen2.5:1.5b-instruct
ollama create chakra -f slm/Modelfile
# app auto-detects it at http://127.0.0.1:11434 (override with OLLAMA_URL / OLLAMA_MODEL)
```

### Fine-tune your own (LoRA)
```bash
npm run slm:export-sft                                   # → slm/data/sft.jsonl (classification, advisories, command parsing)
pip install -U "transformers>=4.44" "peft>=0.12" "trl>=0.10" datasets accelerate bitsandbytes
python slm/finetune_lora.py --base Qwen/Qwen2.5-1.5B-Instruct --epochs 2 --merge
# convert slm/out/chakra-merged to GGUF with llama.cpp, point FROM in slm/Modelfile at it, `ollama create chakra -f slm/Modelfile`
```
Works on one 8 GB GPU or a free Colab T4. Enterprise customers can fine-tune on their own historical incidents.

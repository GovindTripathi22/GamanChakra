"""
LoRA fine-tune of a small open model into the generative Chakra SLM.

Runs on a single consumer GPU (8 GB+) or Google Colab T4. No API keys: the base model is
downloaded once from the public Hugging Face hub, everything else is local.

  pip install -U "transformers>=4.44" "peft>=0.12" "trl>=0.10" datasets accelerate bitsandbytes
  npm run slm:export-sft                       # builds slm/data/sft.jsonl from the repo corpus
  python slm/finetune_lora.py --base Qwen/Qwen2.5-1.5B-Instruct --epochs 2
  # optional: convert to GGUF with llama.cpp and point slm/Modelfile at it, then `ollama create chakra -f slm/Modelfile`
"""
import argparse, os
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig
import torch

p = argparse.ArgumentParser()
p.add_argument("--base", default="Qwen/Qwen2.5-1.5B-Instruct")
p.add_argument("--data", default="slm/data/sft.jsonl")
p.add_argument("--out", default="slm/out/chakra-lora")
p.add_argument("--epochs", type=float, default=2)
p.add_argument("--lr", type=float, default=2e-4)
p.add_argument("--r", type=int, default=16)
p.add_argument("--merge", action="store_true", help="merge LoRA into base weights for GGUF export")
a = p.parse_args()

use_4bit = torch.cuda.is_available()
tok = AutoTokenizer.from_pretrained(a.base)
tok.pad_token = tok.pad_token or tok.eos_token
model = AutoModelForCausalLM.from_pretrained(
    a.base,
    quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_quant_type="nf4") if use_4bit else None,
    torch_dtype=torch.bfloat16 if use_4bit else torch.float32,
    device_map="auto" if use_4bit else None,
)
if use_4bit:
    model = prepare_model_for_kbit_training(model)

ds = load_dataset("json", data_files=a.data, split="train").train_test_split(test_size=0.03, seed=7)
cfg = SFTConfig(
    output_dir=a.out, num_train_epochs=a.epochs, learning_rate=a.lr, per_device_train_batch_size=8,
    gradient_accumulation_steps=2, logging_steps=20, eval_strategy="steps", eval_steps=200, save_steps=400,
    lr_scheduler_type="cosine", warmup_ratio=0.03, bf16=use_4bit, max_seq_length=512, report_to=[],
)
peft_cfg = LoraConfig(r=a.r, lora_alpha=a.r * 2, lora_dropout=0.05, task_type="CAUSAL_LM",
                      target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"])
trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds["train"], eval_dataset=ds["test"], peft_config=peft_cfg, processing_class=tok)
trainer.train()
trainer.save_model(a.out)
print("Saved LoRA adapter to", a.out)

if a.merge:
    from peft import AutoPeftModelForCausalLM
    merged = AutoPeftModelForCausalLM.from_pretrained(a.out, torch_dtype=torch.float16).merge_and_unload()
    os.makedirs("slm/out/chakra-merged", exist_ok=True)
    merged.save_pretrained("slm/out/chakra-merged")
    tok.save_pretrained("slm/out/chakra-merged")
    print("Merged model at slm/out/chakra-merged -> convert with llama.cpp/convert_hf_to_gguf.py")

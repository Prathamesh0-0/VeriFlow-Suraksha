import os
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

def download_model():
    print(f"Downloading {MODEL_NAME} to local cache...")
    print("This will take a few minutes. Please wait.")
    
    # Download tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    print("Tokenizer downloaded.")
    
    # Download model
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    print("Model downloaded successfully!")

if __name__ == "__main__":
    download_model()

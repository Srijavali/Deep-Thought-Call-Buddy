import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

api_key = os.getenv("GROQ_API_KEY")

print("Key loaded:", bool(api_key))
print("Key length:", len(api_key) if api_key else 0)

if not api_key:
    raise SystemExit("GROQ_API_KEY is missing from backend/.env")

client = Groq(api_key=api_key)

try:
    models = client.models.list()
    print("Authentication successful!")
    print("Available models:")
    for model in models.data:
        print(model.id)
except Exception as e:
    print("Error type:", type(e).__name__)
    print("HTTP status:", getattr(e, "status_code", None))
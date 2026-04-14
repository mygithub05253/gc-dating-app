from fastapi import FastAPI
from pydantic import BaseModel
from models import get_kcelectra, get_kosimcse
import torch

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/warmup")
def warmup():
    get_kcelectra()
    get_kosimcse()
    return {"status": "warmed_up", "models": ["kcelectra", "kosimcse"]}


@app.get("/ready")
def ready():
    k_loaded = get_kcelectra.cache_info().currsize > 0
    s_loaded = get_kosimcse.cache_info().currsize > 0
    status = "ready" if (k_loaded and s_loaded) else "loading"
    return {"status": status, "kcelectra": k_loaded, "kosimcse": s_loaded}


class TextIn(BaseModel):
    text: str


@app.post("/embed")
def embed(body: TextIn):
    tok, mdl = get_kcelectra()
    with torch.no_grad():
        inputs = tok(body.text, return_tensors="pt", truncation=True, max_length=128)
        out = mdl(**inputs).last_hidden_state.mean(dim=1).squeeze().tolist()
    return {"embedding": out}

from functools import lru_cache
import torch
from transformers import AutoModel, AutoTokenizer

DEVICE = "cpu"
DTYPE = torch.float16


@lru_cache(maxsize=1)
def get_kcelectra():
    tok = AutoTokenizer.from_pretrained("beomi/KcELECTRA-base")
    mdl = AutoModel.from_pretrained(
        "beomi/KcELECTRA-base",
        torch_dtype=DTYPE,
    ).to(DEVICE).eval()
    return tok, mdl


@lru_cache(maxsize=1)
def get_kosimcse():
    tok = AutoTokenizer.from_pretrained("BM-K/KoSimCSE-roberta")
    mdl = AutoModel.from_pretrained(
        "BM-K/KoSimCSE-roberta",
        torch_dtype=DTYPE,
    ).to(DEVICE).eval()
    return tok, mdl

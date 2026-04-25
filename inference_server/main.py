"""StutterNet+ local inference server."""
import sys
from pathlib import Path
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
from model import FluentNet, load_fluentnet
from preprocess import audio_bytes_to_tensor

CHECKPOINT = Path(__file__).parent.parent / "checkpoints" / "best_model.pt"

CLASS_INFO = {
    "clean": {
        "transcript": "کوئی لکنت نہیں ملی — تقریر روانی کے ساتھ ہے",
        "disfluencyCount": 0, "severity_base": 0, "avgDuration": 0.0,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":0,"color":"bg-primary","percent":0},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "syllable_repetition": {
        "transcript": "ماڈل کا نتیجہ: حرف کی تکرار",
        "disfluencyCount": 1, "severity_base": 50, "avgDuration": 0.5,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":1,"color":"bg-primary","percent":100},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "word_repetition": {
        "transcript": "ماڈل کا نتیجہ: لفظ کی تکرار",
        "disfluencyCount": 1, "severity_base": 60, "avgDuration": 1.0,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":1,"color":"bg-primary","percent":100},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "block": {
        "transcript": "ماڈل کا نتیجہ: رکاوٹ / بلاک",
        "disfluencyCount": 1, "severity_base": 70, "avgDuration": 1.5,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":0,"color":"bg-primary","percent":0},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":1,"color":"bg-secondary","percent":100},
        ],
    },
}

_model: FluentNet | None = None
_class_names: list[str] = []

def get_model():
    global _model, _class_names
    if _model is None:
        if not CHECKPOINT.exists():
            raise RuntimeError(f"Checkpoint not found: {CHECKPOINT}")
        _model, _class_names = load_fluentnet(str(CHECKPOINT))
    return _model, _class_names

app = FastAPI(title="StutterNet+ Inference Server")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:8080","http://localhost:3000","http://localhost:5173"],
    allow_methods=["GET","POST"], allow_headers=["*"])

class Result(BaseModel):
    transcript: str; totalWords: int; disfluencyCount: int
    severityScore: int; confidence: int; avgDuration: float
    stutterTypes: list[dict]; highlightedWords: list[int]
    predictedClass: str; isLocalModelAnalysis: bool

@app.on_event("startup")
async def startup():
    try: get_model(); print(f"[StutterNet+] Model loaded: {CHECKPOINT}")
    except Exception as e: print(f"[StutterNet+] WARNING: {e}")

@app.get("/api/health")
def health():
    try:
        _, names = get_model()
        return {"status":"ok","model":"FluentNet","classes":names}
    except Exception as e:
        return {"status":"error","message":str(e)}

@app.post("/api/analyze", response_model=Result)
async def analyze(audio: UploadFile = File(...)):
    try: model, names = get_model()
    except RuntimeError as e: raise HTTPException(503, str(e))
    data = await audio.read()
    if not data: raise HTTPException(400, "Empty file")
    try: tensor = audio_bytes_to_tensor(data)
    except Exception as e: raise HTTPException(422, f"Preprocessing failed: {e}")
    with torch.no_grad():
        probs = F.softmax(model(tensor), dim=1)[0]
    idx = int(probs.argmax())
    cls = names[idx]
    conf = int(round(probs[idx].item() * 100))
    info = CLASS_INFO[cls]
    severity = int(info["severity_base"] * probs[idx].item()) if cls != "clean" else 0
    return Result(
        transcript=info["transcript"], totalWords=0,
        disfluencyCount=info["disfluencyCount"], severityScore=severity,
        confidence=conf, avgDuration=info["avgDuration"],
        stutterTypes=info["stutterTypes"], highlightedWords=[],
        predictedClass=cls, isLocalModelAnalysis=True,
    )

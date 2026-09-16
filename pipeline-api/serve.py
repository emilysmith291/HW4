"""FastAPI service for the WNBA player-style comp-finder pipeline.

Local dev:  uvicorn serve:app --reload   ->  http://localhost:8000/docs
"""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from pipeline_def import PlayerStyleTransformer  # noqa: F401 — required to unpickle the bundle

ARTIFACT_PATH = "pipeline.joblib"

app = FastAPI(
    title="WNBA Player Comp-Finder",
    description="Input a per-game stat line (yours, a friend's, anyone's) and find the WNBA player-season (2021-2025) with the most similar playing style.",
    version="1.0.0",
)

# Public, read-only, no-auth demo API — the frontend (a different origin on
# Vercel) needs to call it directly from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Loaded once at import time. If this fails, every route below returns 503
# instead of letting requests hit a None bundle and 500.
try:
    import joblib
    import sklearn

    _bundle = joblib.load(ARTIFACT_PATH)
    _load_error: str | None = None

    _artifact_sklearn = _bundle["metadata"]["sklearn_version"]
    if _artifact_sklearn != sklearn.__version__:
        # Not fatal — unpickling worked — but this is exactly the silent
        # version-skew scikit-learn pickles are prone to, so make it loud.
        print(
            f"WARNING: pipeline.joblib was built with scikit-learn {_artifact_sklearn}, "
            f"but this environment has {sklearn.__version__}. Pin the deploy image to match."
        )
except Exception as exc:  # noqa: BLE001 — any load failure should degrade to 503, not crash the process
    _bundle = None
    _load_error = str(exc)


def get_bundle() -> dict:
    if _bundle is None:
        raise HTTPException(status_code=503, detail=f"Model artifact unavailable: {_load_error}")
    return _bundle


class StatLine(BaseModel):
    ppg: float = Field(..., ge=0, le=40, description="Points per game")
    rpg: float = Field(..., ge=0, le=20, description="Rebounds per game")
    apg: float = Field(..., ge=0, le=15, description="Assists per game")
    spg: float = Field(..., ge=0, le=6, description="Steals per game")
    bpg: float = Field(..., ge=0, le=6, description="Blocks per game")
    k: int = Field(5, ge=1, le=8, description="How many comps to return")

    @model_validator(mode="after")
    def _some_activity(self) -> "StatLine":
        if self.ppg + self.rpg + self.apg + self.spg + self.bpg <= 0:
            raise ValueError("at least one stat must be greater than 0")
        return self


class PlayerComp(BaseModel):
    season: int
    player: str
    team: str
    position: str
    games: int
    ppg: float
    rpg: float
    apg: float
    spg: float
    bpg: float
    distance: float
    style: dict[str, float]


class CompareResponse(BaseModel):
    query: StatLine
    style: dict[str, float]
    comps: list[PlayerComp]


@app.get("/health")
def health():
    if _bundle is None:
        raise HTTPException(status_code=503, detail=f"Model artifact unavailable: {_load_error}")
    return {"status": "ok"}


@app.get("/info")
def info():
    bundle = get_bundle()
    return bundle["metadata"]


@app.post("/compare", response_model=CompareResponse)
def compare(query: StatLine):
    bundle = get_bundle()
    pipeline = bundle["pipeline"]
    neighbors = bundle["neighbors"]
    records = bundle["records"]

    X_raw = [[query.ppg, query.rpg, query.apg, query.spg, query.bpg]]
    engineered = pipeline.named_steps["style"].transform(np.asarray(X_raw, dtype=float))
    scaled = pipeline.named_steps["scaler"].transform(engineered)

    k = min(query.k, bundle["metadata"]["max_neighbors"])
    distances, indices = neighbors.kneighbors(scaled, n_neighbors=k)
    feature_names = bundle["metadata"]["engineered_features"]

    # Also run each matched player's own raw stats back through the fitted
    # style step, so the frontend can chart their real profile alongside the
    # query's — not just the distance number.
    raw_features = bundle["metadata"]["raw_features"]
    comp_raw = np.array([[records[idx][f] for f in raw_features] for idx in indices[0]], dtype=float)
    comp_engineered = pipeline.named_steps["style"].transform(comp_raw)

    comps = [
        PlayerComp(
            **records[idx],
            distance=round(float(dist), 4),
            style=dict(zip(feature_names, eng.tolist())),
        )
        for idx, dist, eng in zip(indices[0], distances[0], comp_engineered)
    ]

    return CompareResponse(
        query=query,
        style=dict(zip(feature_names, engineered[0].tolist())),
        comps=comps,
    )

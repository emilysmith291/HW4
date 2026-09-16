"""Fits the player-style comp-finder pipeline and dumps the bundle.

Run with the project venv: .venv/bin/python fit.py
Produces pipeline.joblib containing everything serve.py needs.
"""

from __future__ import annotations

import datetime as dt
import sys

import joblib
import pandas as pd
import sklearn
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from pipeline_def import ENGINEERED_FEATURES, PlayerStyleTransformer, RAW_FEATURES

DATA_PATH = "data/player_seasons.csv"
OUT_PATH = "pipeline.joblib"
N_NEIGHBORS_FITTED = 8  # cap; API requests ask for k <= this


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    required = [*RAW_FEATURES, "season", "player", "team", "position", "games"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        sys.exit(f"data/player_seasons.csv is missing required columns: {missing}")

    df = df.dropna(subset=RAW_FEATURES).reset_index(drop=True)
    if len(df) < N_NEIGHBORS_FITTED:
        sys.exit(f"Need at least {N_NEIGHBORS_FITTED} rows of training data, got {len(df)}")

    X_raw = df[RAW_FEATURES]

    pipeline = Pipeline(
        steps=[
            ("style", PlayerStyleTransformer()),
            ("scaler", StandardScaler()),
        ]
    )
    matrix = pipeline.fit_transform(X_raw)

    neighbors = NearestNeighbors(n_neighbors=N_NEIGHBORS_FITTED, metric="euclidean")
    neighbors.fit(matrix)

    records = df[["season", "player", "team", "position", "games", *RAW_FEATURES]].to_dict(orient="records")

    bundle = {
        "pipeline": pipeline,
        "neighbors": neighbors,
        "matrix": matrix,
        "records": records,
        "metadata": {
            "steps": [name for name, _ in pipeline.steps] + ["neighbors"],
            "raw_features": RAW_FEATURES,
            "engineered_features": ENGINEERED_FEATURES,
            "built_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "sklearn_version": sklearn.__version__,
            "n_records": len(records),
            "max_neighbors": N_NEIGHBORS_FITTED,
        },
    }

    joblib.dump(bundle, OUT_PATH)
    print(f"Wrote {OUT_PATH} — {len(records)} player-seasons, sklearn {sklearn.__version__}")


if __name__ == "__main__":
    main()

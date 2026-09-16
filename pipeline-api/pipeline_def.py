"""Custom transformer for the WNBA player-style comp-finder pipeline.

Must be importable from both fit.py (training) and serve.py (inference) so
that unpickling the fitted bundle works in both places.
"""

from __future__ import annotations

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

# Column order every caller (fit.py, serve.py) must feed this transformer.
RAW_FEATURES = ["ppg", "rpg", "apg", "spg", "bpg"]
ENGINEERED_FEATURES = ["scoring_lean", "rebounding_lean", "playmaking_lean", "defense_lean"]


class PlayerStyleTransformer(BaseEstimator, TransformerMixin):
    """Turns a raw per-game stat line into a scale-invariant "style" vector.

    Raw per-game stats (ppg, rpg, apg, spg, bpg) tell you almost nothing
    about how a rec-league or pickup-game stat line compares to a pro's —
    the magnitudes are worlds apart. So instead of comparing magnitude,
    this computes each category's *share* of a player's total statistical
    production (points+rebounds+assists+defense, each as a fraction of the
    total), then centers those shares on the league averages learned at fit
    time. The result is a "lean" vector — how much more scoring-oriented,
    rebounding-oriented, etc. a stat line is than the average WNBA player —
    that's meaningful for any input, pro or amateur.

    ``mean_shares_`` (one mean share per category, learned from the
    training player-seasons) is the transformer's learned state: refit on a
    different slice of players, or reconstruct fresh instead of loading the
    saved artifact, and every "lean" value it produces shifts.
    """

    def __init__(self, epsilon: float = 1e-6):
        # __init__ only assigns its arguments — no computation here.
        self.epsilon = epsilon

    def fit(self, X, y=None):
        X = self._as_array(X)
        shares = self._shares(X)
        self.mean_shares_ = shares.mean(axis=0)
        self.n_features_in_ = X.shape[1]
        return self

    def transform(self, X):
        X = self._as_array(X)
        shares = self._shares(X)
        return shares - self.mean_shares_

    def get_feature_names_out(self, input_features=None):
        return np.array(ENGINEERED_FEATURES)

    def _shares(self, X: np.ndarray) -> np.ndarray:
        ppg, rpg, apg, spg, bpg = X[:, 0], X[:, 1], X[:, 2], X[:, 3], X[:, 4]
        defense = spg + bpg
        total = ppg + rpg + apg + defense + self.epsilon
        return np.column_stack([ppg / total, rpg / total, apg / total, defense / total])

    @staticmethod
    def _as_array(X) -> np.ndarray:
        if hasattr(X, "to_numpy"):
            return X.to_numpy(dtype=float)
        return np.asarray(X, dtype=float)

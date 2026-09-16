"""Modal deployment for the WNBA player comp-finder API.

Deploy:  modal deploy modal_serve.py
Dev run: modal serve modal_serve.py
"""

import modal

# Must match pipeline.joblib's metadata["sklearn_version"] exactly — a
# scikit-learn version mismatch between training and serving can silently
# change unpickled estimator behavior. Verified against the artifact at
# build time; serve.py also checks this at runtime and warns if it drifts.
SKLEARN_VERSION = "1.9.1"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi==0.141.1",
        "pydantic==2.13.5",
        f"scikit-learn=={SKLEARN_VERSION}",
        "numpy==2.5.3",
        "joblib==1.6.0",
    )
    # Ship exactly the three files the API needs, baked into the image.
    .add_local_file("serve.py", "/root/serve.py", copy=True)
    .add_local_file("pipeline_def.py", "/root/pipeline_def.py", copy=True)
    .add_local_file("pipeline.joblib", "/root/pipeline.joblib", copy=True)
    .workdir("/root")
)

app = modal.App("wnba-comp-finder", image=image)


@app.function(min_containers=1, scaledown_window=600)
@modal.asgi_app()
def web():
    # Imported here (inside the Modal function), not at module scope, so it
    # runs inside the container with the pinned image, not this local file's
    # environment.
    from serve import app as fastapi_app

    return fastapi_app

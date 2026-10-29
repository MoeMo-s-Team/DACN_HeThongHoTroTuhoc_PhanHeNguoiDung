# Colab dependency lock status: Pending

No `ai/requirements.lock` is published. The Python 3.13/Linux transitive graph, hashes and exact already-installed `torch==2.11.0+cu130` official wheel URL/SHA-256 have not been observed or verified in a real Colab runtime. This checkout is CPU-only Python 3.12. Creating a lock without that evidence could replace or break the existing Torch/CUDA installation. Generate a lock only after provenance, dry-run no-Torch-action and installed-file RECORD checks pass.

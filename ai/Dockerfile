FROM python:3.12-slim-bookworm

WORKDIR /app
COPY ai/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.lock
COPY ai/app /app/app
COPY deployment/model-manifest.json /app/model-manifest.json

ENV AI_MODEL_MANIFEST=/app/model-manifest.json
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

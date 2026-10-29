import hashlib
import json
import os


def fixture_request_hash(task, input):
    canonical = json.dumps({'task': task, 'input': input}, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def configure_runtime_allowlist(hashes):
    if not hashes or any(len(value) != 64 for value in hashes):
        raise ValueError('benchmark allowlist must contain SHA-256 fixture request hashes')
    os.environ['AI_RUNTIME_BENCHMARK_MODE'] = '1'
    os.environ['AI_RUNTIME_BENCHMARK_ALLOWLIST'] = ','.join(sorted(hashes))

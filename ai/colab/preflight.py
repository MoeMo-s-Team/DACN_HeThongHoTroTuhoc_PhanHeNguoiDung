"""Fail-closed, injectable Colab checks; the real notebook supplies observed values."""
import base64
import csv
import hashlib
import io
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

EXPECTED = {'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13', 'gpu': 'Tesla T4'}


def preflight_environment(snapshot):
    if not isinstance(snapshot, dict):
        return {'status': 'BLOCKED', 'inferenceAllowed': False, 'reasons': ['missing environment snapshot']}
    reasons = [f'{key} mismatch or unavailable' for key, expected in EXPECTED.items()
        if (not isinstance(snapshot.get(key), str) or not (snapshot[key] == expected or snapshot[key].startswith(expected + '.')))
        if key == 'python']
    reasons.extend(f'{key} mismatch or unavailable' for key, expected in EXPECTED.items()
        if key != 'python' and snapshot.get(key) != expected)
    for key in ('pipCheck', 'nf4Import', 'modelLoad'):
        if snapshot.get(key) is not True:
            reasons.append(f'{key} did not pass')
    return {'status': 'READY' if not reasons else 'BLOCKED', 'inferenceAllowed': not reasons, 'reasons': reasons,
            'snapshot': {key: snapshot.get(key) for key in EXPECTED}}


def validate_install_plan(report):
    if not isinstance(report, dict) or not isinstance(report.get('install'), list):
        return False
    operations = list(report['install']) + (report.get('uninstall') if isinstance(report.get('uninstall'), list) else [])
    return not any((item.get('metadata') or {}).get('name', '').lower() in ('torch', 'pytorch') for item in operations if isinstance(item, dict))


def verify_torch_wheel(wheel_path, source_url, expected_sha256, installed_files):
    parsed = urlparse(source_url)
    path = Path(wheel_path)
    if parsed.scheme != 'https' or parsed.hostname != 'download.pytorch.org' or not path.is_file() or Path(unquote(parsed.path)).name != path.name:
        return False
    if not path.name.startswith('torch-2.11.0+cu130-'):
        return False
    wheel_bytes = path.read_bytes()
    if hashlib.sha256(wheel_bytes).hexdigest() != expected_sha256:
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(wheel_bytes)) as archive:
            record_name = next(name for name in archive.namelist() if name.endswith('.dist-info/RECORD'))
            rows = csv.reader(io.StringIO(archive.read(record_name).decode()))
            checked = 0
            for name, digest, _size in rows:
                if not name.startswith('torch/') or not digest:
                    continue
                scheme, encoded = digest.split('=', 1)
                if scheme != 'sha256' or name not in installed_files:
                    return False
                expected = base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)).hex()
                actual_wheel = hashlib.sha256(archive.read(name)).hexdigest()
                if expected != actual_wheel or installed_files[name] != actual_wheel:
                    return False
                checked += 1
            return checked > 0
    except (OSError, ValueError, KeyError, StopIteration, zipfile.BadZipFile):
        return False

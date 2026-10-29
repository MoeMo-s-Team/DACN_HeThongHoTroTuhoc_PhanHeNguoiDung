import json
import zipfile
import base64
import hashlib
from pathlib import Path
from pathlib import Path
from ai.colab.capacity import account_input, measure_capacity, measure_near_budget


def test_capacity_candidate_stays_pending_and_non_deployable():
    candidate = json.loads(Path('ai/benchmark/capacity-profile.candidate.json').read_text())
    assert candidate == {'status': 'PENDING', 'evidence': [], 'proposedProfile': None}


def test_capacity_accounts_for_complete_prompt_reserve_and_margin_without_truncating():
    request = {'input': {'text': 'Học ' * 30}}
    measured = account_input(request, prompt_tokens=100, schema_tokens=40, output_reserve=80, safety_margin=20, context_window=1000)
    assert measured['inputTokens'] == 140
    assert measured['remainingInputBudget'] == 900
    assert measured['accepted'] is True
    class Tokenizer:
        def apply_chat_template(self, messages, **kwargs):
            assert ' '.join(part['content'] for part in messages if part['role'] == 'user').find('Học ' * 30) >= 0
            assert kwargs == {'tokenize': True, 'add_generation_prompt': True}
            return list(range(1001))
    assert measure_capacity('STUDENT_LEARNING_ANALYSIS', request, tokenizer=Tokenizer(), context_window=1000)['accepted'] is False
    stress = measure_near_budget('STUDENT_LEARNING_ANALYSIS', request, tokenizer=Tokenizer(), output_reserve=80,
        safety_margin=20, context_window=1000, kind='scalar')
    assert stress['stressOnly'] is True and stress['truncated'] is False


def test_torch_wheel_provenance_checks_real_hash_official_url_and_installed_record(tmp_path):
    from ai.colab.preflight import verify_torch_wheel
    content = b'installed torch file'
    digest = hashlib.sha256(content).digest()
    encoded = base64.urlsafe_b64encode(digest).decode().rstrip('=')
    wheel = tmp_path / 'torch-2.11.0+cu130-cp313-cp313-linux_x86_64.whl'
    record = f'torch/example.py,sha256={encoded},{len(content)}\n'
    with zipfile.ZipFile(wheel, 'w') as archive:
        archive.writestr('torch/example.py', content)
        archive.writestr('torch-2.11.0+cu130.dist-info/RECORD', record)
    wheel_hash = hashlib.sha256(wheel.read_bytes()).hexdigest()
    installed = {'torch/example.py': hashlib.sha256(content).hexdigest()}
    source = f'https://download.pytorch.org/whl/cu130/{wheel.name}'
    assert verify_torch_wheel(wheel, source, wheel_hash, installed)
    assert not verify_torch_wheel(wheel, 'https://example.com/torch.whl', wheel_hash, installed)
    assert not verify_torch_wheel(wheel, source, '0' * 64, installed)

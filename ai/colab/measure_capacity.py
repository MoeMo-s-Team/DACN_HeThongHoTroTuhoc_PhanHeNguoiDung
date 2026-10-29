import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from transformers import AutoConfig, AutoTokenizer

from ai.colab.capacity import measure_capacity, measure_near_budget

MODEL = 'Qwen/Qwen3-4B-Instruct-2507'
REVISION = 'cdbee75f17c01a7cc42f958dc650907174af0554'
OUTPUT_RESERVE = 1024
SAFETY_MARGIN = 128


def main():
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
    config = AutoConfig.from_pretrained(MODEL, revision=REVISION)
    window = config.max_position_embeddings
    fixtures = [json.loads(line) for line in (ROOT / 'ai/benchmark/fixtures/fixtures.jsonl').read_text().splitlines()]
    measurements = []
    seen = set()
    for fixture in fixtures:
        measurements.append(measure_capacity(fixture['task'], fixture, tokenizer=tokenizer,
            output_reserve=OUTPUT_RESERVE, safety_margin=SAFETY_MARGIN, context_window=window))
        if fixture['task'] not in seen:
            seen.add(fixture['task'])
            for kind in ('scalar', 'collection'):
                measurements.append(measure_near_budget(fixture['task'], fixture, tokenizer=tokenizer,
                    output_reserve=OUTPUT_RESERVE, safety_margin=SAFETY_MARGIN, context_window=window, kind=kind))
    payload = {'status': 'PENDING', 'modelId': MODEL, 'revision': REVISION, 'contextWindowTokens': window,
        'outputReserveTokens': OUTPUT_RESERVE, 'safetyMarginTokens': SAFETY_MARGIN,
        'tokenizerId': getattr(tokenizer, 'name_or_path', MODEL), 'measurements': measurements,
        'fixtureSha256': hashlib.sha256((ROOT / 'ai/benchmark/fixtures/fixtures.jsonl').read_bytes()).hexdigest(),
        'note': 'Finite tokenizer measurements are evidence samples, not an analytical upper bound or deployable capacity profile.'}
    out = Path('/content/dacn-capacity-measurements.json')
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print(out)


if __name__ == '__main__':
    main()

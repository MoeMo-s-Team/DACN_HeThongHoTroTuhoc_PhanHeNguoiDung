def account_input(request, *, prompt_tokens, schema_tokens, output_reserve, safety_margin, context_window):
    values = (prompt_tokens, schema_tokens, output_reserve, safety_margin, context_window)
    if any(not isinstance(value, int) or value < 0 for value in values) or context_window == 0:
        raise ValueError('capacity measurements must be nonnegative integers')
    total_context = prompt_tokens + schema_tokens + output_reserve + safety_margin
    return {'inputTokens': prompt_tokens + schema_tokens, 'outputReserveTokens': output_reserve,
            'safetyMarginTokens': safety_margin, 'contextWindowTokens': context_window,
            'remainingInputBudget': context_window - output_reserve - safety_margin,
            'accepted': total_context <= context_window, 'truncated': False}


def measure_capacity(task, request, *, tokenizer, output_reserve=1024, safety_margin=128, context_window=32768):
    if not isinstance(request, dict) or not task or not isinstance(request.get('input'), dict):
        raise ValueError('task and complete request are required')
    from ai.runtime.prompts import build_messages
    messages = build_messages(task, request['input'])
    token_ids = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True)
    measured = len(token_ids[0]) if token_ids and isinstance(token_ids[0], (list, tuple)) else len(token_ids)
    result = account_input(request, prompt_tokens=measured, schema_tokens=0,
        output_reserve=output_reserve, safety_margin=safety_margin, context_window=context_window)
    return {**result, 'task': task}


def _replace_first(value, predicate, transform):
    if isinstance(value, dict):
        for key, child in value.items():
            if predicate(child):
                value[key] = transform(child)
                return True
            if _replace_first(child, predicate, transform):
                return True
    elif isinstance(value, list):
        for index, child in enumerate(value):
            if predicate(child):
                value[index] = transform(child)
                return True
            if _replace_first(child, predicate, transform):
                return True
    return False


def measure_near_budget(task, request, *, tokenizer, output_reserve, safety_margin, context_window, kind):
    import copy
    candidate = copy.deepcopy(request)
    if kind == 'scalar':
        found = _replace_first(candidate['input'], lambda value: isinstance(value, str), lambda value: value + (' Học' * 256))
    elif kind == 'collection':
        found = _replace_first(candidate['input'], lambda value: isinstance(value, list) and bool(value), lambda value: value + value[-1:])
    else:
        raise ValueError('capacity stress kind must be scalar or collection')
    if not found:
        return {'task': task, 'kind': kind, 'status': 'NOT_APPLICABLE'}
    rows = []
    for _ in range(1000):
        measured = measure_capacity(task, candidate, tokenizer=tokenizer, output_reserve=output_reserve,
            safety_margin=safety_margin, context_window=context_window)
        rows.append(measured['inputTokens'])
        if not measured['accepted']:
            break
        if kind == 'scalar':
            _replace_first(candidate['input'], lambda value: isinstance(value, str), lambda value: value + (' Học' * 256))
        else:
            _replace_first(candidate['input'], lambda value: isinstance(value, list) and bool(value), lambda value: value + value[-1:] * 4)
    return {'task': task, 'kind': kind, 'status': 'MEASURED' if rows else 'FAILED',
        'largestObservedInputTokens': max((value for value in rows if value <= context_window - output_reserve - safety_margin), default=None),
        'firstOverflowInputTokens': next((value for value in rows if value > context_window - output_reserve - safety_margin), None),
        'sampleCount': len(rows), 'stressOnly': True, 'truncated': False}

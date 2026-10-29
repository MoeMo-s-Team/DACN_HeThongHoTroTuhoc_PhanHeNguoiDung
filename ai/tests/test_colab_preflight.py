from ai.colab.preflight import preflight_environment


def test_preflight_fails_closed_before_model_load_on_environment_mismatch():
    snapshot = {'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13', 'gpu': 'Tesla T4', 'pipCheck': True, 'nf4Import': True, 'modelLoad': True}
    assert preflight_environment(snapshot)['status'] == 'READY'
    assert preflight_environment({**snapshot, 'python': '3.13.7'})['status'] == 'READY'
    for changes in ({'torch': '2.12.0'}, {'python': '3.12'}, {'gpu': None}, {'cuda': None}, {'pipCheck': False}, {'nf4Import': False}):
        candidate = {**snapshot, **changes}
        report = preflight_environment(candidate)
        assert report['status'] == 'BLOCKED'
        assert report['inferenceAllowed'] is False


def test_install_plan_rejects_torch_replacement():
    from ai.colab.preflight import validate_install_plan
    assert validate_install_plan({'install': []}) is True
    assert validate_install_plan({'install': [{'metadata': {'name': 'torch', 'version': '2.12.0'}}]}) is False
    assert validate_install_plan({'install': [], 'uninstall': [{'metadata': {'name': 'torch'}}]}) is False

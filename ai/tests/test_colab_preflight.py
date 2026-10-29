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
    assert validate_install_plan({'install': [{'metadata': {'name': 'transformers'}}]}) is True
    assert validate_install_plan({'install': [{'metadata': {'name': 'torch', 'version': '2.12.0'}}]}) is False
    assert validate_install_plan({'install': [], 'uninstall': [{'metadata': {'name': 'torch'}}]}) is False
    assert validate_install_plan({'install': [{}]}) is False
    assert validate_install_plan({'install': [], 'uninstall': 'malformed'}) is False


def test_wheel_verifier_allows_only_pip_script_shebang_rewrite(tmp_path):
    import base64, csv, hashlib, io, zipfile
    from ai.colab.preflight import verify_torch_wheel
    wheel=tmp_path/'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'
    member='torch-2.11.0+cu130.data/scripts/torchrun'
    payload=b'#!python\nprint("run")\n'
    installed_payload=b'#!/content/dacn-venv/bin/python\nprint("run")\n'
    record_name='torch-2.11.0+cu130.dist-info/RECORD'
    record=io.StringIO(); writer=csv.writer(record)
    writer.writerow([member,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(payload).digest()).decode().rstrip('='),str(len(payload))])
    writer.writerow([record_name,'',''])
    with zipfile.ZipFile(wheel,'w') as archive:
        archive.writestr(member,payload); archive.writestr(record_name,record.getvalue())
    digest=hashlib.sha256(wheel.read_bytes()).hexdigest()
    url='https://download.pytorch.org/whl/cu130/torch/'+wheel.name
    installed={'../../../bin/torchrun':hashlib.sha256(installed_payload).hexdigest(),record_name:'record-file-hash'}
    assert verify_torch_wheel(str(wheel),url,digest,installed,'/content/dacn-venv/bin/python')
    assert not verify_torch_wheel(str(wheel),url,digest,installed)
    assert not verify_torch_wheel(str(wheel),url,digest,{**installed,'../../../bin/torchrun':'0'*64},'/content/dacn-venv/bin/python')


def test_bytecode_code_comparison_preserves_constant_types_and_float_sign():
    from ai.colab.preflight import _same_code
    assert not _same_code(compile('x = True','x.py','exec'),compile('x = 1.00','x.py','exec'))
    assert not _same_code(compile('x = +0.0','x.py','exec'),compile('x = -0.0','x.py','exec'))
    assert _same_code(compile('x = (True, 1.0)','x.py','exec'),compile('x = (True, 1.0)','x.py','exec'))
    assert not _same_code(compile('x = (1, 2)','x.py','exec'),compile('x = (2, 1)','x.py','exec'))


def test_verified_torch_wheel_requires_official_url_hash_and_installed_record(tmp_path):
    import base64, csv, hashlib, io, zipfile
    from ai.colab.preflight import verify_torch_wheel
    wheel=tmp_path/'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'
    payload=b'torch wheel member'; member='torch/__init__.py'
    record=io.StringIO(); writer=csv.writer(record)
    writer.writerow([member,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(payload).digest()).decode().rstrip('='),str(len(payload))])
    record_name='torch-2.11.0+cu130.dist-info/RECORD'; writer.writerow([record_name,'',''])
    with zipfile.ZipFile(wheel,'w') as archive:
        archive.writestr(member,payload); archive.writestr(record_name,record.getvalue())
    digest=hashlib.sha256(wheel.read_bytes()).hexdigest()
    url='https://download.pytorch.org/whl/cu130/torch/'+wheel.name
    installed={member:hashlib.sha256(payload).hexdigest(),record_name:'record-file-hash'}
    assert verify_torch_wheel(str(wheel),url,digest,installed)
    assert not verify_torch_wheel(str(wheel),url,'0'*64,installed)
    assert not verify_torch_wheel(str(wheel),url,digest,{**installed,member:'0'*64})
    assert not verify_torch_wheel(str(wheel),url,digest,{**installed,'torch/unrecorded.py':'0'*64})
    pyc='torch/__pycache__/__init__.cpython-313.pyc'
    assert not verify_torch_wheel(str(wheel),url,digest,{**installed,pyc:'1'*64})
    assert not verify_torch_wheel(str(wheel),url,digest,{**installed,'torch/__pycache__/intruder.cpython-313.pyc':'1'*64})


def test_official_torch_cdn_link_keeps_index_hash(tmp_path):
    from ai.colab.torch_provenance import official_wheel_link
    wheel_name='torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'
    digest='a'*64
    html=f'<a href="https://download-r2.pytorch.org/whl/cu130/{wheel_name}#sha256={digest}">{wheel_name}</a>'
    link,expected=official_wheel_link(html)
    assert link.startswith('https://download-r2.pytorch.org/')
    assert expected==digest


def test_real_pip_install_preserves_wheel_record_with_generated_pyc_and_script(tmp_path):
    import base64, csv, hashlib, io, json, subprocess, sys, venv, zipfile
    from ai.colab.preflight import verify_torch_wheel
    wheel=tmp_path/'torch-2.11.0+cu130-py3-none-any.whl'
    record_name='torch-2.11.0+cu130.dist-info/RECORD'
    members={'torch/__init__.py':b'VALUE = 1\n',
        'torch-2.11.0+cu130.dist-info/METADATA':b'Metadata-Version: 2.1\nName: torch\nVersion: 2.11.0+cu130\n',
        'torch-2.11.0+cu130.dist-info/WHEEL':b'Wheel-Version: 1.0\nGenerator: test\nRoot-Is-Purelib: true\nTag: py3-none-any\n',
        'torch-2.11.0+cu130.data/scripts/torchrun':b'#!python\nprint("run")\n'}
    record=io.StringIO(); writer=csv.writer(record)
    for name,payload in members.items(): writer.writerow([name,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(payload).digest()).decode().rstrip('='),str(len(payload))])
    writer.writerow([record_name,'','']); members[record_name]=record.getvalue().encode()
    with zipfile.ZipFile(wheel,'w') as archive:
        for name,payload in members.items(): archive.writestr(name,payload)
    env=tmp_path/'venv'; venv.EnvBuilder(with_pip=True).create(env)
    python=env/('Scripts/python.exe' if sys.platform=='win32' else 'bin/python')
    subprocess.run([str(python),'-m','pip','install','--no-deps','--no-index',str(wheel)],check=True,capture_output=True,text=True)
    probe="import hashlib,json,torch; from pathlib import Path; from importlib.metadata import distribution; root=Path(torch.__file__).parent.parent; d=distribution('torch'); print(json.dumps({'root':str(root),'files':{str(r):hashlib.sha256((root/r).read_bytes()).hexdigest() for r in d.files if (root/r).is_file()}}))"
    inventory=json.loads(subprocess.run([str(python),'-c',probe],check=True,capture_output=True,text=True).stdout)
    installed=inventory['files']; root=inventory['root']
    digest=hashlib.sha256(wheel.read_bytes()).hexdigest()
    url='https://download.pytorch.org/whl/cu130/torch/'+wheel.name
    assert any('/__pycache__/' in name and name.endswith('.pyc') for name in installed)
    assert verify_torch_wheel(str(wheel),url,digest,installed,str(python),root)
    pyc_name=next(name for name in installed if '/__pycache__/' in name and name.endswith('.pyc'))
    pyc_path=next((env/'lib').glob('python*/site-packages'))/pyc_name
    tampered=bytearray(pyc_path.read_bytes()); tampered[-1]^=1; pyc_path.write_bytes(tampered)
    changed=dict(installed); changed[pyc_name]=hashlib.sha256(tampered).hexdigest()
    assert not verify_torch_wheel(str(wheel),url,digest,changed,str(python),root)


def test_lock_must_contain_the_verified_torch_wheel_hash():
    from ai.colab.preflight import lock_contains_torch_hash
    digest = 'a' * 64
    lock = "\n".join([
        'torch==2.11.0+cu130 \\', f'    --hash=sha256:{digest}', '',
        'transformers==5.21.0 \\', f'    --hash=sha256:{"b" * 64}',
    ])
    assert lock_contains_torch_hash(lock, digest)
    assert not lock_contains_torch_hash(lock, 'c' * 64)
    assert not lock_contains_torch_hash('torch==2.11.0+cu130', digest)
    malformed = "\n".join(['torch==2.11.0+cu130 \\', '    --hash=sha256:bad'])
    other_package = "\n".join(['transformers==5.21.0 \\', f'    --hash=sha256:{digest}'])
    assert not lock_contains_torch_hash(malformed, digest)
    assert not lock_contains_torch_hash(other_package, digest)
    multi_hash = "\n".join([
        'torch==2.11.0+cu130 \\',
        f'    --hash=sha256:{digest} \\',
        f'    --hash=sha256:{"d" * 64}',
    ])
    assert lock_contains_torch_hash(multi_hash, digest)
    assert not lock_contains_torch_hash('torch==2.11.0+cu130\n    --hash=sha256:'+digest,digest)
    dangling = "\n".join(['torch==2.11.0+cu130 \\', f'    --hash=sha256:{digest} \\'])
    garbage = "\n".join(['torch==2.11.0+cu130 \\', f'    --hash=sha256:{digest}', '    garbage'])
    assert not lock_contains_torch_hash(dangling,digest)
    assert not lock_contains_torch_hash(garbage,digest)


def test_provenance_rejects_source_proof_change_after_initial_verification(tmp_path):
    import json, subprocess, pytest
    from ai.colab.torch_provenance import verify_source_proof_unchanged
    repo=tmp_path/'repo'; repo.mkdir()
    subprocess.run(['git','init','-q',str(repo)],check=True)
    subprocess.run(['git','-C',str(repo),'config','user.email','test@example.com'],check=True)
    subprocess.run(['git','-C',str(repo),'config','user.name','Test'],check=True)
    (repo/'source.py').write_text('verified')
    subprocess.run(['git','-C',str(repo),'add','source.py'],check=True)
    subprocess.run(['git','-C',str(repo),'commit','-qm','source'],check=True)
    commit=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    tree=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD^{tree}'],capture_output=True,text=True,check=True).stdout.strip()
    proof=tmp_path/'proof.json'; proof.write_text(json.dumps({'verified':True,'commit':commit,'tree':tree}))
    original=proof.read_bytes(); original_hash=__import__('hashlib').sha256(original).hexdigest()
    assert verify_source_proof_unchanged(proof,repo,commit,original_hash)
    proof.write_text(json.dumps({'verified':True,'commit':commit,'tree':tree,'changed':True}))
    with pytest.raises(ValueError,match='source proof changed'):
        verify_source_proof_unchanged(proof,repo,commit,original_hash)


def test_provenance_rejects_torch_snapshot_drift():
    import pytest
    from ai.colab.torch_provenance import verify_torch_snapshot
    snapshot={'pythonExecutable':'/usr/bin/python','torchRoot':'/usr/lib/python3.13/site-packages','torch':'2.11.0+cu130','cuda':'13.0','gpu':'Tesla T4','torchFiles':{'torch/__init__.py':'a'*64,'torch/__pycache__/__init__.cpython-313.pyc':'c'*64}}
    assert verify_torch_snapshot(snapshot,{**snapshot,'torchFiles':dict(snapshot['torchFiles'])})
    with pytest.raises(ValueError,match='changed'):
        verify_torch_snapshot(snapshot,{**snapshot,'torchFiles':{'torch/__init__.py':'a'*64,'torch/__pycache__/__init__.cpython-313.pyc':'d'*64}})


def test_provenance_requires_clean_matching_source_proof(tmp_path):
    import json, subprocess
    from ai.colab.torch_provenance import verify_source_proof
    repo=tmp_path/'repo'; repo.mkdir()
    subprocess.run(['git','init','-q',str(repo)],check=True)
    subprocess.run(['git','-C',str(repo),'config','user.email','test@example.com'],check=True)
    subprocess.run(['git','-C',str(repo),'config','user.name','Test'],check=True)
    (repo/'source.py').write_text('verified')
    subprocess.run(['git','-C',str(repo),'add','source.py'],check=True)
    subprocess.run(['git','-C',str(repo),'commit','-qm','source'],check=True)
    commit=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    tree=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD^{tree}'],capture_output=True,text=True,check=True).stdout.strip()
    proof=tmp_path/'proof.json'; proof.write_text(json.dumps({'verified':True,'commit':commit,'tree':tree}))
    assert verify_source_proof(proof,repo)==commit
    proof.write_text(json.dumps({'verified':True,'commit':'0'*40}))
    import pytest
    with pytest.raises(ValueError,match='mismatched'):
        verify_source_proof(proof,repo)
    proof.write_text(json.dumps({'verified':True,'commit':commit,'tree':tree}))
    (repo/'dirty').write_text('modified')
    with pytest.raises(ValueError,match='dirty'):
        verify_source_proof(proof,repo)


def test_notebook_checks_lock_and_provenance_before_dry_run():
    import json
    notebook=json.loads(open('ai/colab/phase-1d3.ipynb').read())
    source_setup=''.join(notebook['cells'][2]['source'])
    source=''.join(notebook['cells'][7]['source'])
    assert 'sys.path.insert(0,str(REPO))' in source_setup
    assert 'write_text' not in source_setup
    assert source.index('lock_contains_torch_hash') < source.index("'--dry-run'")
    assert 'sourceProofSha256' in source and 'verify_torch_wheel' in source
    assert 'validate_install_plan' in source
    snapshot_cell=''.join(notebook['cells'][3]['source'])
    assert 'import json, platform, torch, hashlib, sys, subprocess' in snapshot_cell
    assert 'from pathlib import Path' in snapshot_cell
    assert "not str(rel).endswith('.pyc')" not in snapshot_cell
    assert "not str(rel).endswith('.pyc')" not in source
    assert source.count('installed_torch_files()!=snapshot') == 2
    preflight=''.join(notebook['cells'][8]['source'])
    assert "pip_check=subprocess.run([VENV_PY,'-m','pip','check'],capture_output=True,text=True)" in preflight
    assert "'pipCheck':pip_check.returncode==0" in preflight
    assert all(not cell.get('outputs') and cell.get('execution_count') is None for cell in notebook['cells'] if cell['cell_type']=='code')

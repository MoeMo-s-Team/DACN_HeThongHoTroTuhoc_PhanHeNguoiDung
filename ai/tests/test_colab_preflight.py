from ai.colab.preflight import preflight_environment


def test_preflight_fails_closed_before_model_load_on_environment_mismatch():
    snapshot = {'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13', 'gpu': 'Tesla T4', 'pipCheck': True, 'nf4Import': True, 'modelLoad': True,
        'venvIsolated': True, 'systemSitePackagesUnchanged': True,
        'systemSitePackagesBefore': {'/system/site-packages/example.py': 'a' * 64},
        'systemSitePackagesAfter': {'/system/site-packages/example.py': 'a' * 64}}
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


def test_downloaded_torch_wheel_must_match_official_index_hash(tmp_path, monkeypatch):
    import hashlib, io, zipfile
    import ai.colab.torch_provenance as provenance
    downloader=getattr(provenance,'download_official_wheel',None)
    assert callable(downloader), 'official wheel bootstrap is not implemented'
    wheel=io.BytesIO()
    with zipfile.ZipFile(wheel,'w') as archive:
        archive.writestr('torch-2.11.0+cu130.dist-info/RECORD','')
    payload=wheel.getvalue(); digest=hashlib.sha256(payload).hexdigest()
    index=(f'<a href="https://download-r2.pytorch.org/whl/cu130/torch/{provenance.WHEEL}#sha256={digest}">wheel</a>').encode()
    class Response:
        def __init__(self,body): self.body=body; self.used=False
        def __enter__(self): return self
        def __exit__(self,*_): pass
        def read(self,*_):
            if self.used: return b''
            self.used=True
            return self.body
    responses=[Response(index),Response(payload)]
    requested=[]
    def fake_urlopen(url,timeout):
        requested.append((url,timeout)); return responses.pop(0)
    monkeypatch.setattr(provenance,'urlopen',fake_urlopen)
    result=downloader(tmp_path)
    assert result['sha256']==digest
    assert result['officialUrl'].startswith('https://download-r2.pytorch.org/')
    assert result['wheelPath']==str(tmp_path/provenance.WHEEL)
    assert (tmp_path/provenance.WHEEL).read_bytes()==payload
    assert requested[0][0]==provenance.INDEX
    assert requested[1][0].startswith('https://download-r2.pytorch.org/')

    bad_responses=[Response(index),Response(payload+b'tampered')]
    monkeypatch.setattr(provenance,'urlopen',lambda url,timeout: bad_responses.pop(0))
    with __import__('pytest').raises(ValueError,match='SHA-256'):
        downloader(tmp_path/'bad')


def test_real_pip_install_preserves_wheel_record_with_generated_pyc_and_script(tmp_path):
    import base64, csv, hashlib, io, json, subprocess, sys, venv, zipfile
    from pathlib import Path
    from ai.colab.preflight import verify_torch_wheel
    wheel=tmp_path/'torch-2.11.0+cu130-py3-none-any.whl'
    record_name='torch-2.11.0+cu130.dist-info/RECORD'
    members={'torch/__init__.py':b'VALUE = 1\n',
        'torch-2.11.0+cu130.dist-info/METADATA':b'Metadata-Version: 2.1\nName: torch\nVersion: 2.11.0+cu130\n',
        'torch-2.11.0+cu130.dist-info/WHEEL':b'Wheel-Version: 1.0\nGenerator: test\nRoot-Is-Purelib: true\nTag: py3-none-any\n',
        'torch-2.11.0+cu130.dist-info/entry_points.txt':b'[console_scripts]\ntorchfake = torch:main\n',
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
    script='../../../bin/torchfake'; script_path=Path(root)/script; original_script=script_path.read_bytes()
    changed_script=original_script+b'# tampered\n'; script_path.write_bytes(changed_script)
    tampered_scripts=dict(installed); tampered_scripts[script]=hashlib.sha256(changed_script).hexdigest()
    assert not verify_torch_wheel(str(wheel),url,digest,tampered_scripts,str(python),root)
    crlf_script=original_script.replace(b'\n',b'\r\n'); script_path.write_bytes(crlf_script)
    crlf_files=dict(installed); crlf_files[script]=hashlib.sha256(crlf_script).hexdigest()
    assert not verify_torch_wheel(str(wheel),url,digest,crlf_files,str(python),root)
    script_path.write_bytes(original_script)
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
    pip_compile_lock='\n'.join(['torch==2.11.0+cu130 \\',f'    --hash=sha256:{digest}','    # via -r ai/requirements.in'])
    assert lock_contains_torch_hash(pip_compile_lock,digest)
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
    snapshot={'pythonExecutable':'/usr/bin/python','systemPrefix':'/usr','systemBasePrefix':'/usr','torchRoot':'/usr/lib/python3.13/site-packages','torch':'2.11.0+cu130','cuda':'13.0','gpu':'Tesla T4','torchFiles':{'torch/__init__.py':'a'*64,'torch/__pycache__/__init__.cpython-313.pyc':'c'*64},
        'systemSitePackagesRoots':['/usr/lib/python3.13/site-packages'],'systemSitePackagesFiles':{'/usr/lib/python3.13/site-packages/example.py':'d'*64}}
    assert verify_torch_snapshot(snapshot,{**snapshot,'torchFiles':dict(snapshot['torchFiles'])})
    with pytest.raises(ValueError,match='changed'):
        verify_torch_snapshot(snapshot,{**snapshot,'torchFiles':{'torch/__init__.py':'a'*64,'torch/__pycache__/__init__.cpython-313.pyc':'d'*64}})
    with pytest.raises(ValueError,match='Python prefix'):
        verify_torch_snapshot({**snapshot,'systemPrefix':''},snapshot)
    with pytest.raises(ValueError,match='changed'):
        verify_torch_snapshot(snapshot,{**snapshot,'systemBasePrefix':'/different'})


def test_provenance_rejects_any_system_site_packages_inventory_delta():
    import pytest
    from ai.colab.torch_provenance import verify_torch_snapshot
    packages = {'/usr/lib/python3.13/site-packages/example.py': 'a' * 64}
    snapshot = {'pythonExecutable':'/usr/bin/python3','systemPrefix':'/usr','systemBasePrefix':'/usr','torchRoot':'/usr/lib/python3.13/site-packages',
        'torch':'2.11.0+cu130','cuda':'13.0','gpu':'Tesla T4','torchFiles':{'torch/__init__.py':'b'*64},
        'systemSitePackagesRoots':['/usr/lib/python3.13/site-packages'],'systemSitePackagesFiles':packages}
    assert verify_torch_snapshot(snapshot,{**snapshot,'systemSitePackagesFiles':dict(packages)})
    changed = [
        {'/usr/lib/python3.13/site-packages/example.py': 'c' * 64},
        {**packages, '/usr/lib/python3.13/site-packages/extra.py': 'd' * 64},
        {},
    ]
    for inventory in changed:
        with pytest.raises(ValueError,match='changed'):
            verify_torch_snapshot(snapshot,{**snapshot,'systemSitePackagesFiles':inventory})
    incomplete={key:value for key,value in snapshot.items() if not key.startswith('systemSitePackages')}
    with pytest.raises(ValueError,match='missing'):
        verify_torch_snapshot(incomplete,incomplete)


def test_installed_torch_snapshot_reads_the_requested_venv_interpreter(tmp_path, monkeypatch):
    import inspect, os, sys, venv
    from ai.colab.torch_provenance import installed_torch_snapshot
    assert 'python_executable' in inspect.signature(installed_torch_snapshot).parameters, 'Torch snapshot cannot target the isolated venv'
    env=tmp_path/'venv'; venv.EnvBuilder(with_pip=False).create(env)
    python=env/'bin'/'python'
    python.unlink(); python.symlink_to(sys.executable)
    assert python.resolve()==__import__('pathlib').Path(sys.executable).resolve()
    site=next((env/'lib').glob('python*/site-packages'))
    package=site/'torch'; package.mkdir()
    (package/'__init__.py').write_text("__version__='2.11.0+cu130'\nclass Version: cuda='13.0'\nversion=Version()\n")
    (package/'intruder.py').write_text('unrecorded = True\n')
    torchgen=site/'torchgen'; torchgen.mkdir(); (torchgen/'recorded.py').write_text('recorded = True\n'); (torchgen/'intruder.py').write_text('unrecorded = True\n')
    dist=site/'torch-2.11.0+cu130.dist-info'; dist.mkdir()
    (dist/'METADATA').write_text('Metadata-Version: 2.1\nName: torch\nVersion: 2.11.0+cu130\n')
    (dist/'RECORD').write_text('torch/__init__.py,,\ntorch-2.11.0+cu130.dist-info/METADATA,,\ntorch-2.11.0+cu130.dist-info/RECORD,,\ntorchgen/recorded.py,,\n')
    fake_bin=tmp_path/'bin'; fake_bin.mkdir()
    nvidia_smi=fake_bin/'nvidia-smi'
    nvidia_smi.write_text('#!/bin/sh\nprintf "Tesla T4, GPU-test, 15360 MiB\\n"\n')
    nvidia_smi.chmod(0o755)
    monkeypatch.setenv('PATH',str(fake_bin)+':'+os.environ['PATH'])
    snapshot=installed_torch_snapshot(str(python))
    assert snapshot['pythonExecutable']==str(python)
    assert snapshot['torch']=='2.11.0+cu130'
    assert snapshot['cuda']=='13.0'
    assert snapshot['gpu'].startswith('Tesla T4')
    assert snapshot['torchFiles']['torch/__init__.py']
    assert snapshot['torchFiles']['torch/intruder.py']
    assert snapshot['torchFiles']['torchgen/intruder.py']


def test_venv_torch_inventory_fails_closed_on_directory_symlinks(tmp_path):
    import types, pytest
    from pathlib import Path
    from ai.colab.torch_provenance import _torch_file_inventory
    root=tmp_path/'site-packages'; (root/'torch').mkdir(parents=True)
    (root/'torch'/'__init__.py').write_text('')
    external=tmp_path/'external'; external.mkdir(); (external/'hidden.py').write_text('hidden')
    (root/'torch'/'linked').symlink_to(external,target_is_directory=True)
    with pytest.raises(ValueError,match='directory symlink'):
        _torch_file_inventory(root,types.SimpleNamespace(files=[Path('torch/__init__.py')]))


def test_requirements_in_directly_pins_torch_for_the_generated_lock():
    from pathlib import Path
    assert 'torch==2.11.0+cu130' in Path('ai/requirements.in').read_text().splitlines()


def test_create_provenance_binds_official_record_to_venv_and_keeps_system_snapshot(tmp_path, monkeypatch):
    import base64, csv, hashlib, inspect, io, json, zipfile
    import ai.colab.torch_provenance as provenance
    assert 'venv_python' in inspect.signature(provenance.create_provenance).parameters, 'provenance still targets only the system Torch'
    source_proof=tmp_path/'proof.json'; source_proof.write_text('{"verified":true}')
    snapshot_path=tmp_path/'system.json'; output_path=tmp_path/'provenance.json'
    system_packages={'/system/site-packages/example.py':'a'*64}
    system={'python':'3.13.16','pythonExecutable':'/usr/bin/python3','systemPrefix':'/usr','systemBasePrefix':'/usr','torchRoot':'/system/site-packages',
        'torch':'2.11.0+cu130','cuda':'13.0','gpu':'Tesla T4, GPU-test, 15360 MiB',
        'torchFiles':{'torch/__init__.py':'b'*64},'systemSitePackagesRoots':['/system/site-packages'],
        'systemSitePackagesFiles':system_packages}
    snapshot_path.write_text(json.dumps(system))
    venv_python=tmp_path/'venv'/'bin'/'python'; venv_python.parent.mkdir(parents=True)
    venv_snapshot={'python':'3.13.16','pythonExecutable':str(venv_python),'prefix':str(venv_python.parent.parent),'basePrefix':'/usr','pyvenvCfg':'include-system-site-packages = false\n','torchRoot':str(venv_python.parent.parent/'lib/site-packages'),
        'torch':'2.11.0+cu130','cuda':'13.0','gpu':system['gpu'],'torchFiles':{}}
    member='torch/__init__.py'; payload=b'official torch init'
    record_name='torch-2.11.0+cu130.dist-info/RECORD'
    record=io.StringIO(); csv.writer(record).writerow([member,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(payload).digest()).decode().rstrip('='),str(len(payload))])
    csv.writer(record).writerow([record_name,'',''])
    wheel=tmp_path/provenance.WHEEL
    with zipfile.ZipFile(wheel,'w') as archive:
        archive.writestr(member,payload); archive.writestr(record_name,record.getvalue())
    wheel_sha=hashlib.sha256(wheel.read_bytes()).hexdigest()
    venv_snapshot['torchFiles']={member:hashlib.sha256(payload).hexdigest(),record_name:hashlib.sha256(record.getvalue().encode()).hexdigest()}
    monkeypatch.setattr(provenance,'verify_source_proof',lambda *_:'c'*40)
    monkeypatch.setattr(provenance,'verify_source_proof_unchanged',lambda *_:True)
    monkeypatch.setattr(provenance,'installed_system_snapshot',lambda:dict(system))
    monkeypatch.setattr(provenance,'installed_torch_snapshot',lambda python_executable=None: venv_snapshot if python_executable==str(venv_python) else (_ for _ in ()).throw(AssertionError('wrong Torch interpreter')))
    link=f'https://download-r2.pytorch.org/whl/cu130/torch/{provenance.WHEEL}#sha256={wheel_sha}'
    index=f'<a href="{link}">wheel</a>'.encode()
    class Response:
        def __init__(self,body): self.body=body; self.used=False
        def __enter__(self): return self
        def __exit__(self,*_): pass
        def read(self,*_):
            if self.used: return b''
            self.used=True
            return self.body
    responses=[Response(index)]
    monkeypatch.setattr(provenance,'urlopen',lambda *_args,**_kwargs: responses.pop(0))
    result=provenance.create_provenance(snapshot_path,output_path,source_proof,'unused',wheel,venv_python=str(venv_python))
    assert result['version']=='2.11.0+cu130'
    assert result['systemPythonExecutable']==system['pythonExecutable']
    assert result['systemTorchRoot']==system['torchRoot']
    assert result['venvPythonExecutable']==str(venv_python)
    assert result['venvTorchRoot']==venv_snapshot['torchRoot']
    assert result['sha256']==wheel_sha
    assert result['venvTorchFiles']['torch/__init__.py']==venv_snapshot['torchFiles']['torch/__init__.py']
    import pytest
    monkeypatch.setattr(provenance,'urlopen',lambda *_args,**_kwargs: Response(index))
    monkeypatch.setattr(provenance,'installed_torch_snapshot',lambda *_: {**venv_snapshot,'basePrefix':venv_snapshot['prefix']})
    with pytest.raises(ValueError,match='isolated venv'):
        provenance.create_provenance(snapshot_path,output_path,source_proof,'unused',wheel,venv_python=str(venv_python))


def test_notebook_installs_only_after_isolated_venv_preinstall_gates():
    import json
    notebook=json.loads(open('ai/colab/phase-1d3.ipynb').read())
    code=[''.join(cell['source']) for cell in notebook['cells'] if cell['cell_type']=='code']
    joined='\n'.join(code)
    snapshot=next(cell for cell in code if 'Snapshot and hash every system site-packages file' in cell)
    assert 'sys.dont_write_bytecode=True' in snapshot
    assert snapshot.index('sys.dont_write_bytecode=True') < snapshot.index('import torch')
    assert snapshot.index("os.environ['PYTHONDONTWRITEBYTECODE']='1'") < snapshot.index("'pip','freeze'")
    assert 'system_site_packages_inventory' in snapshot
    assert '_torch_file_inventory' in snapshot
    assert 'systemSitePackagesFiles' in snapshot
    assert "[sys.executable,'-m','venv','--without-pip',str(VENV_ROOT)],check=True,env=PIP_ENV" in joined
    assert "[sys.executable,'-m','pip','--python',str(VENV_ROOT),'install','--index-url','https://pypi.org/simple','pip']" in joined
    assert "'pipRoot':str(Path(pip.__file__).resolve().parent)" in joined
    assert "Path(venv_info['pipRoot']).is_relative_to(Path(venv_info['prefix']))" in joined
    assert '--system-site-packages' not in joined
    dry_run=next(cell for cell in code if "'--dry-run'" in cell)
    installer=next(cell for cell in code if "'install','--require-hashes'" in cell)
    assert code.index(dry_run) < code.index(installer)
    assert 'validate_venv_install_plan' in dry_run
    assert 'lock_contains_torch_hash' in dry_run
    assert 'sourceProofSha256' in dry_run
    assert 'download_official_wheel' in dry_run
    assert dry_run.index('download_official_wheel') < dry_run.index("'--dry-run'")
    assert dry_run.index('system_site_packages_inventory') < dry_run.index("'--dry-run'")
    assert 'VENV_PY' in installer
    assert 'torch_provenance.py' in installer and '--venv-python' in installer
    assert 'PIP_ENV' in dry_run and 'PIP_ENV' in installer
    assert "not key.startswith('PIP_')" in dry_run and 'PIP_CONFIG_FILE' in dry_run
    assert 'venvPythonExecutable' in dry_run and 'venvPythonExecutable' in installer
    assert 'include-system-site-packages = false' in installer
    assert 'installedPackages' in dry_run and 'installedPackages' in installer
    assert 'pip bootstrapped into isolated venv; locked application dependencies not installed.' in dry_run
    assert '/content/dacn-venv-after.json' in joined
    preflight=next(cell for cell in code if "'pip','check'" in cell)
    assert "'gpu':venv_probe['gpu'].split(',')[0].strip()" in preflight
    assert "torch.cuda.synchronize() if available else None" in preflight
    assert "torch.tensor([1.0,2.0],device='cuda')*2" in preflight
    smoke=next(cell for cell in code if 'smoke_probe=' in cell)
    benchmark=next(cell for cell in code if 'ai/benchmark/run.py' in cell)
    assert "http://127.0.0.1:8000/v1/infer" in smoke and "[VENV_PY,'-B','-c',smoke_probe]" in smoke
    assert "dacn-real-inference-smoke.json" in benchmark and "smoke_evidence.get('passed')" in benchmark
    assert 'node_version=' not in smoke and 'pnpm_version=' not in smoke
    assert 'node_version=' in benchmark and 'pnpm_version=' in benchmark
    env_helper=next(cell for cell in code if 'def isolated_venv_env()' in cell)
    assert "not key.startswith('PIP_')" in env_helper
    assert "'PYTHONPATH','PYTHONHOME','PYTHONUSERBASE','VIRTUAL_ENV'" in env_helper
    assert "'PIP_CONFIG_FILE':os.devnull" in env_helper
    assert smoke.index("os.environ['AI_RUNTIME_BENCHMARK_MODE']='0'") < smoke.index('PIP_ENV=isolated_venv_env()') < smoke.index('subprocess.Popen')
    assert benchmark.index("os.environ['AI_RUNTIME_BENCHMARK_MODE']='1'") < benchmark.index('PIP_ENV=isolated_venv_env()') < benchmark.index('subprocess.Popen')
    assert benchmark.index("os.environ['AI_BENCHMARK_MODE']='1'") < benchmark.rindex('PIP_ENV=isolated_venv_env()') < benchmark.index('run_result=subprocess.run')
    assert code.index(smoke) < code.index(benchmark)
    resolver=next(''.join(cell['source']) for cell in notebook['cells'] if cell['cell_type']=='markdown' and 'Dependency lock gate' in ''.join(cell['source']))
    assert '%%bash' in resolver
    assert 'set -euo pipefail' in resolver
    assert 'venv --without-pip' in resolver
    assert 'pip --python "$RESOLVER" install' in resolver
    assert 'mktemp -d /content/phase1d3-lock-resolver.' in resolver
    assert 'for name in ${!PIP_@}; do unset \"$name\"; done' in resolver
    assert 'unset PYTHONPATH PYTHONHOME PYTHONUSERBASE PYTHONEXECUTABLE PYTHONSTARTUP PYTHONNOUSERSITE VIRTUAL_ENV' in resolver
    import os, subprocess
    cleanup='set -euo pipefail\n'+'\n'.join(line for line in resolver.splitlines() if line.startswith('for name in ${!PIP_@}') or line.startswith('unset PYTHONPATH'))
    inherited={**os.environ,'PIP_PYTHON':'/system/python','PIP_TARGET':'/system/site','PYTHONPATH':'/system/modules','PYTHONHOME':'/system/python'}
    clean=subprocess.run(['bash','-c',cleanup+'\nenv'],env=inherited,capture_output=True,text=True,check=True).stdout
    assert all(name+'=' not in clean for name in ('PIP_PYTHON','PIP_TARGET','PYTHONPATH','PYTHONHOME'))
    assert 'export PIP_CONFIG_FILE=/dev/null' in resolver
    assert '--index-url https://pypi.org/simple --extra-index-url https://download.pytorch.org/whl/cu130' in resolver
    assert '--allow-unsafe' in resolver
    assert "python3 -c 'import sys; print(sys.executable)'" in resolver
    assert 'python3.13 -m venv' not in resolver
    benchmark=next(cell for cell in code if 'ai/benchmark/run.py' in cell)
    assert "[VENV_PY,'ai/benchmark/run.py'" in benchmark
    assert all(not cell.get('outputs') and cell.get('execution_count') is None for cell in notebook['cells'] if cell['cell_type']=='code')


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
    code=[''.join(cell['source']) for cell in notebook['cells'] if cell['cell_type']=='code']
    source_setup=next(cell for cell in code if 'sys.path.insert(0,str(REPO))' in cell)
    source=next(cell for cell in code if "'--dry-run'" in cell)
    assert 'sys.path.insert(0,str(REPO))' in source_setup
    assert 'write_text' not in source_setup
    assert source.index('lock_contains_torch_hash') < source.index("'--dry-run'")
    assert 'sourceProofSha256' in source and 'validate_venv_install_plan' in source
    snapshot_cell=next(cell for cell in code if 'Snapshot and hash every system site-packages file' in cell)
    assert snapshot_cell.index('sys.dont_write_bytecode=True') < snapshot_cell.index('import torch')
    assert 'system_site_packages_inventory' in snapshot_cell
    assert 'from pathlib import Path' in snapshot_cell
    assert 'systemSitePackagesFiles' in snapshot_cell
    assert '--system-site-packages' not in '\n'.join(code)
    assert 'installed_torch_files' not in '\n'.join(code)
    assert source.count('system_site_packages_inventory(') >= 2
    preflight=next(cell for cell in code if "'pip','check'" in cell)
    assert "pip_check=subprocess.run([VENV_PY,'-m','pip','check'],capture_output=True,text=True,env=PIP_ENV)" in preflight
    assert "'pipCheck':pip_check.returncode==0" in preflight
    assert all(not cell.get('outputs') and cell.get('execution_count') is None for cell in notebook['cells'] if cell['cell_type']=='code')


def test_preflight_blocks_when_system_site_packages_changed_after_venv_install():
    snapshot = {
        'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13.16', 'gpu': 'Tesla T4',
        'pipCheck': True, 'nf4Import': True, 'modelLoad': True,
        'venvIsolated': True, 'systemSitePackagesUnchanged': False,
    }
    report = preflight_environment(snapshot)
    assert report['status'] == 'BLOCKED'
    assert report['inferenceAllowed'] is False
    assert any('system site-packages' in reason for reason in report['reasons'])


def test_preflight_detects_modified_added_and_removed_system_package_files():
    base = {
        'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13.16', 'gpu': 'Tesla T4',
        'pipCheck': True, 'nf4Import': True, 'modelLoad': True,
        'venvIsolated': True, 'systemSitePackagesUnchanged': True,
    }
    original = {'/system/site-packages/example.py': 'a' * 64}
    changed = [
        {'/system/site-packages/example.py': 'b' * 64},
        {**original, '/system/site-packages/new.py': 'c' * 64},
        {},
    ]
    for after in changed:
        report = preflight_environment({**base, 'systemSitePackagesBefore': original, 'systemSitePackagesAfter': after})
        assert report['status'] == 'BLOCKED'
        assert report['inferenceAllowed'] is False
        assert any('system site-packages' in reason for reason in report['reasons'])


def test_system_site_packages_inventory_hashes_nested_files_and_symlink_targets(tmp_path):
    import ai.colab.preflight as preflight
    inventory = getattr(preflight, 'system_site_packages_inventory', None)
    assert callable(inventory), 'system site-packages inventory is not implemented'
    root = tmp_path / 'site-packages'
    package = root / 'example'
    package.mkdir(parents=True)
    target = package / 'module.py'
    target.write_text('before')
    alias = package / 'alias.py'
    alias.symlink_to(target)
    file_inventory = inventory([root])
    assert file_inventory[str(target)] == __import__('hashlib').sha256(b'before').hexdigest()
    assert file_inventory[str(alias)] != file_inventory[str(target)]
    other_target=package/'other.py'; other_target.write_text('before')
    alias.unlink(); alias.symlink_to(other_target)
    assert inventory([root])[str(alias)]!=file_inventory[str(alias)]
    target.write_text('after')
    changed_inventory = inventory([root])
    assert changed_inventory[str(target)] != file_inventory[str(target)]
    target.unlink()
    (package / 'added.py').write_text('new')
    added_inventory = inventory([root])
    assert str(target) not in added_inventory
    assert str(package / 'added.py') in added_inventory


def test_system_site_packages_inventory_fails_closed_on_directory_symlinks(tmp_path):
    import pytest
    from ai.colab.preflight import system_site_packages_inventory
    root=tmp_path/'site-packages'; root.mkdir()
    external=tmp_path/'external'; external.mkdir(); (external/'module.py').write_text('before')
    (root/'linked-package').symlink_to(external, target_is_directory=True)
    with pytest.raises(ValueError,match='directory symlink'):
        system_site_packages_inventory([root])


def test_venv_install_plan_allows_only_verified_torch_in_fresh_isolated_venv(tmp_path):
    from pathlib import Path
    import ai.colab.preflight as preflight
    validator = getattr(preflight, 'validate_venv_install_plan', None)
    assert callable(validator), 'isolated-venv install plan validation is not implemented'
    wheel_name = 'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'
    wheel_path = tmp_path / wheel_name
    wheel_path.write_bytes(b'verified wheel bytes')
    digest = __import__('hashlib').sha256(wheel_path.read_bytes()).hexdigest()
    venv = tmp_path / 'venv'
    venv.mkdir()
    (venv / 'pyvenv.cfg').write_text('include-system-site-packages = false\n')
    python = venv / 'bin' / 'python'
    metadata = {'name': 'torch', 'version': '2.11.0+cu130'}
    install = {'metadata': metadata, 'download_info': {
        'url': 'https://download-r2.pytorch.org/whl/cu130/torch/' + wheel_name,
        'archive_info': {'hashes': {'sha256': digest}},
    }}
    dependency={'metadata':{'name':'transformers','version':'5.21.0'},'download_info':{
        'url':'https://files.pythonhosted.org/packages/transformers.whl',
        'archive_info':{'hashes':{'sha256':'c'*64}}}}
    environment={'python_full_version':'3.13.16','platform_system':'Linux','platform_machine':'x86_64','sys_platform':'linux'}
    report = {'version':'1','pip_version':'26.0','environment':environment,'install': [install,dependency], 'uninstall': []}
    args = {
        'torch_version': '2.11.0+cu130', 'wheel_sha256': digest,
        'verified_wheel_path': wheel_path,
        'python_executable': python, 'python_version':'3.13.16','venv_prefix': venv, 'base_prefix': '/usr',
        'torch_installed': False,'installed_packages':{},
    }
    assert validator(report, **args)
    assert not validator({**report, 'uninstall': [{'metadata': {'name': 'transformers'}}]}, **args)
    pip_install={**dependency,'metadata':{'name':'pip','version':'26.0'}}
    assert not validator({**report,'install':[install,dependency,pip_install]}, **{**args,'installed_packages':{'pip':'25.0'}})
    assert not validator({key:value for key,value in report.items() if key!='environment'}, **args)
    assert not validator({**report, 'version':'2'}, **args)
    assert not validator({**report, 'install':[install,{'metadata':{'name':'transformers','version':'5.21.0'}}]}, **args)
    assert not validator({**report, 'environment':{**environment,'platform_machine':'aarch64'}}, **args)
    assert not validator({**report, 'environment':{**environment,'python_full_version':'3.12.0'}}, **args)
    assert not validator({'install': [{**install, 'metadata': {**metadata, 'version': '2.12.0'}}], 'uninstall': []}, **args)
    assert not validator({'install': [{**install, 'download_info': {'url': install['download_info']['url'], 'archive_info': {'hashes': {'sha256': 'b' * 64}}}}], 'uninstall': []}, **args)
    assert not validator(report, **{**args, 'python_executable': Path('/usr/bin/python3')})
    (venv / 'pyvenv.cfg').write_text('include-system-site-packages = true\n')
    assert not validator(report, **args)
    (venv / 'pyvenv.cfg').write_text('include-system-site-packages = false\n')
    assert not validator(report, **{**args, 'torch_installed': True})
    assert not validator({'install': [{}], 'uninstall': []}, **args)

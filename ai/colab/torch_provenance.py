"""Fetch the pinned official Torch wheel and prove it matches this Colab install."""
import hashlib
import json
import os
import platform
import re
import sys
import tempfile
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse, parse_qs
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from ai.colab.preflight import system_site_packages_inventory, verify_torch_wheel

INDEX = 'https://download.pytorch.org/whl/cu130/torch/'
WHEEL = 'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'
OFFICIAL_HOSTS = {'download.pytorch.org', 'download-r2.pytorch.org'}


class WheelLinks(HTMLParser):
    def __init__(self):
        super().__init__(); self.hrefs=[]
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href=dict(attrs).get('href')
            if href: self.hrefs.append(href)


def official_wheel_link(index_html):
    parser=WheelLinks(); parser.feed(index_html)
    links=[urljoin(INDEX,href) for href in parser.hrefs if Path(unquote(urlparse(href).path)).name == WHEEL]
    if len(links)!=1:
        raise ValueError('official index must provide exactly one matching wheel')
    parsed=urlparse(links[0]); digest=parse_qs(parsed.fragment).get('sha256',[])
    if parsed.scheme!='https' or parsed.hostname not in OFFICIAL_HOSTS or len(digest)!=1 or len(digest[0])!=64:
        raise ValueError('official wheel link is missing a valid SHA-256')
    return links[0],digest[0]


def download_official_wheel(output_dir):
    with urlopen(INDEX,timeout=30) as response:
        link,expected=official_wheel_link(response.read().decode())
    output_dir=Path(output_dir)
    output_dir.mkdir(parents=True,exist_ok=True)
    wheel_path=output_dir/WHEEL
    if wheel_path.exists():
        if hashlib.sha256(wheel_path.read_bytes()).hexdigest()!=expected:
            raise ValueError('existing Torch wheel does not match official index SHA-256')
    else:
        descriptor,temporary=tempfile.mkstemp(prefix=WHEEL+'.',suffix='.part',dir=output_dir)
        try:
            with os.fdopen(descriptor,'wb') as target, urlopen(link,timeout=120) as response:
                while chunk:=response.read(1024*1024): target.write(chunk)
            actual=hashlib.sha256(Path(temporary).read_bytes()).hexdigest()
            if actual!=expected:
                raise ValueError('downloaded Torch wheel does not match official index SHA-256')
            os.replace(temporary,wheel_path)
        except BaseException:
            if os.path.exists(temporary): os.unlink(temporary)
            raise
    return {'wheelPath':str(wheel_path.resolve()),'officialUrl':link.split('#',1)[0],'sha256':expected}


def verify_source_proof(proof_path, repo_path):
    proof=json.loads(Path(proof_path).read_text())
    repo=Path(repo_path)
    commit=subprocess.run(['git','rev-parse','HEAD'],cwd=repo,capture_output=True,text=True,check=True).stdout.strip()
    tree=subprocess.run(['git','rev-parse','HEAD^{tree}'],cwd=repo,capture_output=True,text=True,check=True).stdout.strip()
    dirty=subprocess.run(['git','status','--porcelain','--untracked-files=all'],cwd=repo,capture_output=True,text=True,check=True).stdout.splitlines()
    if not proof.get('verified') or proof.get('commit')!=commit or proof.get('tree')!=tree or dirty:
        raise ValueError('source proof is missing, mismatched, or checkout is dirty')
    return commit


def verify_source_proof_unchanged(proof_path, repo_path, expected_commit, expected_hash):
    if verify_source_proof(proof_path,repo_path)!=expected_commit or hashlib.sha256(Path(proof_path).read_bytes()).hexdigest()!=expected_hash:
        raise ValueError('source proof changed or checkout no longer matches')
    return True


def verify_torch_snapshot(snapshot, current):
    for candidate in (snapshot,current):
        roots=candidate.get('systemSitePackagesRoots') if isinstance(candidate,dict) else None
        files=candidate.get('systemSitePackagesFiles') if isinstance(candidate,dict) else None
        if not isinstance(roots,list) or not roots or not isinstance(files,dict):
            raise ValueError('system site-packages inventory is missing or malformed')
        if not isinstance(candidate.get('systemPrefix'),str) or not candidate['systemPrefix'] or not isinstance(candidate.get('systemBasePrefix'),str) or not candidate['systemBasePrefix']:
            raise ValueError('system Python prefix identity is missing or malformed')
    if any(snapshot.get(key) != current.get(key) for key in ('python','pythonExecutable','systemPrefix','systemBasePrefix','torchRoot','torch','cuda','gpu','torchFiles','systemSitePackagesRoots','systemSitePackagesFiles')):
        raise ValueError('installed Torch or Colab runtime changed since the snapshot')
    return True


def _snapshot_torch_in_process():
    import torch
    from importlib.metadata import distribution
    root=Path(torch.__file__).parent.parent
    files=_torch_file_inventory(root,distribution('torch'))
    gpu=subprocess.run(['nvidia-smi','--query-gpu=name,uuid,memory.total','--format=csv,noheader'],capture_output=True,text=True,check=True).stdout.strip()
    return {'python':platform.python_version(),'pythonExecutable':sys.executable,'systemPrefix':sys.prefix,'systemBasePrefix':sys.base_prefix,
        'torchRoot':str(root),'torch':torch.__version__,'cuda':torch.version.cuda,'gpu':gpu,'torchFiles':files}


def _torch_file_inventory(root, distribution):
    files={str(rel):hashlib.sha256((root/rel).read_bytes()).hexdigest() for rel in distribution.files if (root/rel).is_file()}
    top_levels={Path(str(rel)).parts[0] for rel in distribution.files if Path(str(rel)).parts and Path(str(rel)).parts[0] not in ('.','..')}
    for package in (root/name for name in top_levels):
        if package.is_symlink():
            raise ValueError(f'isolated Torch directory symlink is unsupported: {package}')
        if package.is_dir():
            for path in package.rglob('*'):
                if path.is_symlink() and path.is_dir():
                    raise ValueError(f'isolated Torch directory symlink is unsupported: {path}')
                if path.is_file():
                    relative=path.relative_to(root).as_posix()
                    files[relative]=hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def installed_torch_snapshot(python_executable=None):
    if python_executable is None:
        return _snapshot_torch_in_process()
    python=Path(python_executable)
    if not python.is_file():
        raise ValueError('target Python interpreter is missing')
    probe='''
import json,subprocess,sys,torch
from importlib.metadata import distribution
from pathlib import Path
import platform
from ai.colab.torch_provenance import _torch_file_inventory
root=Path(torch.__file__).parent.parent
files=_torch_file_inventory(root,distribution('torch'))
gpu=subprocess.run(['nvidia-smi','--query-gpu=name,uuid,memory.total','--format=csv,noheader'],capture_output=True,text=True,check=True).stdout.strip()
print(json.dumps({'python':platform.python_version(),'pythonExecutable':sys.executable,'prefix':sys.prefix,'basePrefix':sys.base_prefix,
    'pyvenvCfg':(Path(sys.prefix)/'pyvenv.cfg').read_text(),'torchRoot':str(root),'torch':torch.__version__,'cuda':torch.version.cuda,'gpu':gpu,'torchFiles':files}))
'''
    env=os.environ.copy()
    for key in ('PYTHONPATH','PYTHONHOME','PYTHONUSERBASE','VIRTUAL_ENV'):
        env.pop(key,None)
    env.update({'PYTHONNOUSERSITE':'1','PYTHONDONTWRITEBYTECODE':'1'})
    result=subprocess.run([str(python),'-B','-c',probe],cwd=ROOT,capture_output=True,text=True,check=True,env=env)
    return json.loads(result.stdout)


def installed_system_snapshot():
    import site
    roots=[path for path in site.getsitepackages() if Path(path).is_dir()]
    if site.ENABLE_USER_SITE and Path(site.getusersitepackages()).is_dir():
        roots.append(site.getusersitepackages())
    snapshot=_snapshot_torch_in_process()
    snapshot['systemSitePackagesRoots']=roots
    snapshot['systemSitePackagesFiles']=system_site_packages_inventory(roots)
    return snapshot


def create_provenance(snapshot_path, output_path, source_proof_path, repo_path, wheel_path=None, venv_python=None):
    if not venv_python:
        raise ValueError('isolated venv Python is required for Torch provenance')
    source_commit=verify_source_proof(source_proof_path,repo_path)
    source_proof_hash=hashlib.sha256(Path(source_proof_path).read_bytes()).hexdigest()
    snapshot=json.loads(Path(snapshot_path).read_text())
    verify_source_proof_unchanged(source_proof_path,repo_path,source_commit,source_proof_hash)
    verify_torch_snapshot(snapshot,installed_system_snapshot())
    if snapshot.get('python')!='3.13.16' or snapshot.get('torch')!='2.11.0+cu130' or snapshot.get('cuda')!='13.0' or 'Tesla T4' not in snapshot.get('gpu',''):
        raise ValueError('Colab snapshot does not match the reported Python/Torch/CUDA/T4 runtime')
    with urlopen(INDEX,timeout=30) as response:
        link,expected=official_wheel_link(response.read().decode())
    if wheel_path is None:
        wheel_path=download_official_wheel(tempfile.gettempdir())['wheelPath']
    actual=hashlib.sha256(Path(wheel_path).read_bytes()).hexdigest()
    if actual!=expected:
        raise ValueError('downloaded Torch wheel does not match official index SHA-256')
    venv_snapshot=installed_torch_snapshot(venv_python)
    prefix=Path(venv_snapshot.get('prefix','')).absolute()
    try:
        Path(venv_snapshot.get('pythonExecutable','')).absolute().relative_to(prefix)
    except ValueError as exc:
        raise ValueError('isolated venv interpreter is outside its prefix') from exc
    if Path(venv_python).absolute()!=Path(venv_snapshot.get('pythonExecutable','')).absolute():
        raise ValueError('isolated venv interpreter changed during provenance')
    if (prefix==Path(venv_snapshot.get('basePrefix','')).absolute()
            or Path(venv_snapshot.get('basePrefix','')).absolute()!=Path(snapshot.get('systemPrefix','')).absolute()
            or not re.search(
            r'^include-system-site-packages\s*=\s*false\s*$',venv_snapshot.get('pyvenvCfg','').lower(),re.M)):
        raise ValueError('isolated venv is missing or exposes system site-packages')
    if venv_snapshot.get('python')!=snapshot.get('python') or venv_snapshot.get('torch')!='2.11.0+cu130' or venv_snapshot.get('cuda')!='13.0' or 'Tesla T4' not in venv_snapshot.get('gpu',''):
        raise ValueError('isolated venv Torch/CUDA/T4 runtime does not match the candidate')
    if not verify_torch_wheel(wheel_path,link,actual,venv_snapshot.get('torchFiles',{}),venv_snapshot.get('pythonExecutable'),venv_snapshot.get('torchRoot')):
        raise ValueError('isolated venv Torch RECORD does not match the verified official wheel')
    verify_source_proof_unchanged(source_proof_path,repo_path,source_commit,source_proof_hash)
    verify_torch_snapshot(snapshot,installed_system_snapshot())
    result={'version':venv_snapshot['torch'],'wheelPath':str(Path(wheel_path).resolve()),'officialUrl':link.split('#',1)[0],
        'sha256':actual,'recordCheckedFiles':sum(name.startswith('torch/') and not name.endswith('.pyc') for name in venv_snapshot['torchFiles']),
        'systemPythonExecutable':snapshot['pythonExecutable'],'systemTorchRoot':snapshot['torchRoot'],
        'systemSitePackagesRoots':snapshot['systemSitePackagesRoots'],
        'systemSitePackagesSha256':hashlib.sha256(json.dumps(snapshot['systemSitePackagesFiles'],sort_keys=True,separators=(',',':')).encode()).hexdigest(),
        'venvPythonVersion':venv_snapshot['python'],'venvPythonExecutable':venv_snapshot['pythonExecutable'],'venvTorchRoot':venv_snapshot['torchRoot'],
        'venvTorchFiles':venv_snapshot['torchFiles'],
        'sourceCommit':source_commit,'sourceProofSha256':source_proof_hash}
    Path(output_path).write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument('--snapshot',default='/content/dacn-colab-before.json'); parser.add_argument('--output',default='/content/torch-wheel-provenance.json'); parser.add_argument('--source-proof',default='/content/dacn-source-proof.json'); parser.add_argument('--repo',required=True); parser.add_argument('--wheel'); parser.add_argument('--venv-python',required=True); args=parser.parse_args()
    print(json.dumps(create_provenance(args.snapshot,args.output,args.source_proof,args.repo,args.wheel,args.venv_python),indent=2))

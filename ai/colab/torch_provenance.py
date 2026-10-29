"""Fetch the pinned official Torch wheel and prove it matches this Colab install."""
import hashlib
import json
import sys
import tempfile
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse, parse_qs
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from ai.colab.preflight import verify_torch_wheel

INDEX = 'https://download.pytorch.org/whl/cu130/torch/'
WHEEL = 'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'


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
    if parsed.scheme!='https' or parsed.hostname!='download.pytorch.org' or len(digest)!=1 or len(digest[0])!=64:
        raise ValueError('official wheel link is missing a valid SHA-256')
    return links[0],digest[0]


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
    if any(snapshot.get(key) != current.get(key) for key in ('pythonExecutable','torchRoot','torch','cuda','gpu','torchFiles')):
        raise ValueError('installed Torch or Colab runtime changed since the snapshot')
    return True


def installed_torch_snapshot():
    import torch
    from importlib.metadata import distribution
    import subprocess
    root=Path(torch.__file__).parent.parent
    files={str(rel):hashlib.sha256((root/rel).read_bytes()).hexdigest() for rel in distribution('torch').files if (root/rel).is_file()}
    gpu=subprocess.run(['nvidia-smi','--query-gpu=name,uuid,memory.total','--format=csv,noheader'],capture_output=True,text=True,check=True).stdout.strip()
    return {'pythonExecutable':sys.executable,'torchRoot':str(root),'torch':torch.__version__,'cuda':torch.version.cuda,'gpu':gpu,'torchFiles':files}


def create_provenance(snapshot_path, output_path, source_proof_path, repo_path, wheel_path=None):
    source_commit=verify_source_proof(source_proof_path,repo_path)
    source_proof_hash=hashlib.sha256(Path(source_proof_path).read_bytes()).hexdigest()
    snapshot=json.loads(Path(snapshot_path).read_text())
    verify_source_proof_unchanged(source_proof_path,repo_path,source_commit,source_proof_hash)
    verify_torch_snapshot(snapshot,installed_torch_snapshot())
    if snapshot.get('python')!='3.13.16' or snapshot.get('torch')!='2.11.0+cu130' or snapshot.get('cuda')!='13.0' or 'Tesla T4' not in snapshot.get('gpu',''):
        raise ValueError('Colab snapshot does not match the reported Python/Torch/CUDA/T4 runtime')
    with urlopen(INDEX,timeout=30) as response:
        link,expected=official_wheel_link(response.read().decode())
    if wheel_path is None:
        wheel_path=str(Path(tempfile.gettempdir())/WHEEL)
        with urlopen(link,timeout=120) as response, open(wheel_path,'wb') as target:
            while chunk:=response.read(1024*1024): target.write(chunk)
    actual=hashlib.sha256(Path(wheel_path).read_bytes()).hexdigest()
    verify_torch_snapshot(snapshot,installed_torch_snapshot())
    if actual!=expected or not verify_torch_wheel(wheel_path,link,actual,snapshot.get('torchFiles',{}),snapshot.get('pythonExecutable'),snapshot.get('torchRoot')):
        raise ValueError('downloaded wheel hash or installed Torch RECORD does not match')
    verify_source_proof_unchanged(source_proof_path,repo_path,source_commit,source_proof_hash)
    verify_torch_snapshot(snapshot,installed_torch_snapshot())
    result={'version':snapshot['torch'],'wheelPath':str(Path(wheel_path).resolve()),'officialUrl':link.split('#',1)[0],
        'sha256':actual,'recordCheckedFiles':sum(name.startswith('torch/') and not name.endswith('.pyc') for name in snapshot['torchFiles']),
        'sourceCommit':source_commit,'sourceProofSha256':source_proof_hash}
    Path(output_path).write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument('--snapshot',default='/content/dacn-colab-before.json'); parser.add_argument('--output',default='/content/torch-wheel-provenance.json'); parser.add_argument('--source-proof',default='/content/dacn-source-proof.json'); parser.add_argument('--repo',required=True); parser.add_argument('--wheel'); args=parser.parse_args()
    print(json.dumps(create_provenance(args.snapshot,args.output,args.source_proof,args.repo,args.wheel),indent=2))

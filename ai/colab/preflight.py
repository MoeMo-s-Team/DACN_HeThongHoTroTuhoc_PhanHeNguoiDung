"""Fail-closed, injectable Colab checks; the real notebook supplies observed values."""
import base64
import csv
import hashlib
import io
import re
import struct
import types
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

EXPECTED = {'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13', 'gpu': 'Tesla T4'}


def _same_constant(left, right):
    if type(left) is not type(right):
        return False
    if isinstance(left, types.CodeType):
        return _same_code(left,right)
    if isinstance(left, float):
        return struct.pack('!d',left)==struct.pack('!d',right)
    if isinstance(left, complex):
        return struct.pack('!dd',left.real,left.imag)==struct.pack('!dd',right.real,right.imag)
    if isinstance(left, tuple):
        return len(left)==len(right) and all(_same_constant(a,b) for a,b in zip(left,right))
    if isinstance(left, frozenset):
        remaining=list(right)
        for item in left:
            match=next((index for index,candidate in enumerate(remaining) if _same_constant(item,candidate)),None)
            if match is None:
                return False
            remaining.pop(match)
        return not remaining
    return left==right


def _same_code(left, right):
    fields=('co_argcount','co_posonlyargcount','co_kwonlyargcount','co_nlocals','co_stacksize','co_flags',
        'co_code','co_names','co_varnames','co_freevars','co_cellvars','co_filename','co_name','co_qualname',
        'co_firstlineno','co_linetable','co_exceptiontable')
    return all(getattr(left,key)==getattr(right,key) for key in fields) and len(left.co_consts)==len(right.co_consts) and all(
        _same_constant(a,b) for a,b in zip(left.co_consts,right.co_consts))


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
    uninstall=report.get('uninstall',[])
    if not isinstance(uninstall,list): return False
    operations=report['install']+uninstall
    if any(not isinstance(item,dict) or not isinstance(item.get('metadata'),dict) or not isinstance(item['metadata'].get('name'),str) for item in operations): return False
    return not any(item['metadata']['name'].lower() in ('torch','pytorch') for item in operations)


def lock_contains_torch_hash(lock_text, digest):
    if not isinstance(lock_text,str) or not re.fullmatch(r'[0-9a-f]{64}',str(digest)):
        return False
    lines=lock_text.splitlines()
    for index,line in enumerate(lines):
        if re.fullmatch(r'torch==2\.11\.0\+cu130\s*\\?',line.strip()):
            block=[line.strip()]
            cursor=index+1
            while cursor<len(lines) and lines[cursor].strip() and lines[cursor].startswith((' ','\t')):
                block.append(lines[cursor].strip()); cursor+=1
            if len(block)<2 or not block[0].endswith('\\'):
                return False
            hashes=[]
            for continuation in block[1:]:
                match=re.fullmatch(r'--hash=sha256:([0-9a-f]{64})(?:\s+\\)?',continuation)
                if not match: return False
                hashes.append(match.group(1))
            if any(not block[position].endswith('\\') for position in range(1,len(block)-1)):
                return False
            if block[-1].endswith('\\'): return False
            return bool(hashes) and digest in hashes
    return False


def verify_torch_wheel(wheel_path, source_url, expected_sha256, installed_files, python_executable=None, installed_root=None):
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
            rows = list(csv.reader(io.StringIO(archive.read(record_name).decode())))
            checked = 0
            expected_installed=set()
            for name, digest, _size in rows:
                if name==record_name and not digest: continue
                if not digest: return False
                scheme, encoded = digest.split('=', 1)
                installed_name=name
                if '.data/' in name:
                    prefix,tail=name.split('.data/',1); scheme_name,relative=tail.split('/',1)
                    installed_name={'purelib':relative,'platlib':relative,'scripts':'../../../bin/'+relative,
                        'data':'../../../'+relative,'headers':'../../../include/'+relative}.get(scheme_name,'')
                if scheme != 'sha256' or not installed_name or installed_name not in installed_files:
                    return False
                expected = base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)).hex()
                wheel_file=archive.read(name)
                actual_wheel = hashlib.sha256(wheel_file).hexdigest()
                installed_hash=actual_wheel
                if '.data/scripts/' in name and python_executable and wheel_file.split(b'\n',1)[0] in (b'#!python',b'#!pythonw'):
                    installed_script=b'#!'+python_executable.encode()+b'\n'+wheel_file.split(b'\n',1)[1]
                    installed_hash=hashlib.sha256(installed_script).hexdigest()
                if expected != actual_wheel or installed_files[installed_name] != installed_hash:
                    return False
                expected_installed.add(installed_name)
                checked += 1
            generated_pyc=set()
            for name in installed_files:
                if '/__pycache__/' not in name or not name.endswith('.pyc'):
                    continue
                directory, filename=name.split('/__pycache__/',1)
                match=re.fullmatch(r'(.+)\.cpython-\d+(?:\.opt-\d+)?\.pyc',filename)
                if not match or directory+'/'+match.group(1)+'.py' not in expected_installed:
                    return False
                if not installed_root:
                    return False
                pyc_path=Path(installed_root)/name
                pyc=pyc_path.read_bytes()
                if hashlib.sha256(pyc).hexdigest()!=installed_files[name] or pyc[:4]!=__import__('importlib.util').util.MAGIC_NUMBER or len(pyc)<16:
                    return False
                flags=struct.unpack('<I',pyc[4:8])[0]
                source=archive.read(directory+'/'+match.group(1)+'.py')
                if flags>3 or (flags & 1 and pyc[8:16]!=__import__('importlib.util').util.source_hash(source)):
                    return False
                import marshal
                code=marshal.loads(pyc[16:])
                if not isinstance(code,types.CodeType):
                    return False
                optimize=1 if '.opt-1.pyc' in filename else 2 if '.opt-2.pyc' in filename else 0
                if not _same_code(code,compile(source,code.co_filename,'exec',optimize=optimize)):
                    return False
                generated_pyc.add(name)
            generated={name for name in installed_files if name in {record_name,record_name.replace('/RECORD','/INSTALLER'),record_name.replace('/RECORD','/REQUESTED'),record_name.replace('/RECORD','/direct_url.json')}}
            return checked>0 and set(installed_files)==expected_installed|generated|generated_pyc
    except (OSError, ValueError, KeyError, StopIteration, zipfile.BadZipFile, EOFError, TypeError, struct.error):
        return False

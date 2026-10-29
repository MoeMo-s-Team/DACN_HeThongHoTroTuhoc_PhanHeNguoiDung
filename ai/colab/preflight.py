"""Fail-closed, injectable Colab checks; the real notebook supplies observed values."""
import base64
import csv
import configparser
import hashlib
import io
import os
import re
import struct
import types
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

EXPECTED = {'torch': '2.11.0+cu130', 'cuda': '13.0', 'python': '3.13', 'gpu': 'Tesla T4'}
TORCH_WHEEL = 'torch-2.11.0+cu130-cp313-cp313-manylinux_2_28_x86_64.whl'


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


def system_site_packages_inventory(roots):
    inventory={}
    for root in roots:
        base=Path(root)
        if not base.is_dir():
            raise ValueError(f'system site-packages directory is unavailable: {base}')
        if base.is_symlink():
            raise ValueError(f'system site-packages directory symlink is unsupported: {base}')
        for path in base.rglob('*'):
            if path.is_symlink():
                if path.is_dir():
                    raise ValueError(f'system site-packages directory symlink is unsupported: {path}')
                target=os.readlink(path).encode()
                content=path.read_bytes() if path.is_file() else b''
                inventory[str(path.absolute())]=hashlib.sha256(target+b'\0'+content).hexdigest()
            elif path.is_file():
                inventory[str(path.absolute())]=hashlib.sha256(path.read_bytes()).hexdigest()
    return inventory


def system_site_packages_unchanged(before, after):
    digest=re.compile(r'[0-9a-f]{64}')
    return isinstance(before,dict) and isinstance(after,dict) and bool(before) and before==after and all(
        isinstance(path,str) and isinstance(value,str) and digest.fullmatch(value) for path,value in before.items())


def preflight_environment(snapshot):
    if not isinstance(snapshot, dict):
        return {'status': 'BLOCKED', 'inferenceAllowed': False, 'reasons': ['missing environment snapshot']}
    reasons = [f'{key} mismatch or unavailable' for key, expected in EXPECTED.items()
        if (not isinstance(snapshot.get(key), str) or not (snapshot[key] == expected or snapshot[key].startswith(expected + '.')))
        if key == 'python']
    reasons.extend(f'{key} mismatch or unavailable' for key, expected in EXPECTED.items()
        if key != 'python' and snapshot.get(key) != expected)
    if snapshot.get('venvIsolated') is not True:
        reasons.append('venv is not isolated from system site-packages')
    if snapshot.get('systemSitePackagesUnchanged') is not True:
        reasons.append('system site-packages changed or were not verified')
    if not system_site_packages_unchanged(snapshot.get('systemSitePackagesBefore'), snapshot.get('systemSitePackagesAfter')):
        reasons.append('system site-packages file inventory changed or is unavailable')
    for key in ('pipCheck', 'nf4Import', 'modelLoad'):
        if snapshot.get(key) is not True:
            reasons.append(f'{key} did not pass')
    return {'status': 'READY' if not reasons else 'BLOCKED', 'inferenceAllowed': not reasons, 'reasons': reasons,
            'snapshot': {key: snapshot.get(key) for key in EXPECTED} | {
                'venvIsolated': snapshot.get('venvIsolated'),
                'systemSitePackagesUnchanged': snapshot.get('systemSitePackagesUnchanged')
            }}


def validate_install_plan(report):
    if not isinstance(report, dict) or not isinstance(report.get('install'), list):
        return False
    uninstall=report.get('uninstall',[])
    if not isinstance(uninstall,list): return False
    operations=report['install']+uninstall
    if any(not isinstance(item,dict) or not isinstance(item.get('metadata'),dict) or not isinstance(item['metadata'].get('name'),str) for item in operations): return False
    return not any(item['metadata']['name'].lower() in ('torch','pytorch') for item in operations)


def validate_venv_install_plan(report, *, torch_version, wheel_sha256, verified_wheel_path,
        python_executable, python_version, venv_prefix, base_prefix, torch_installed, installed_packages=None):
    try:
        prefix=Path(venv_prefix).absolute()
        executable=Path(python_executable).absolute()
        executable.relative_to(prefix)
        if prefix==Path(base_prefix).absolute() or torch_installed:
            return False
        if not isinstance(installed_packages,dict) or any(not isinstance(name,str) or not isinstance(version,str) for name,version in installed_packages.items()):
            return False
        config=(prefix/'pyvenv.cfg').read_text().lower()
        if not re.search(r'^include-system-site-packages\s*=\s*false\s*$',config,re.M):
            return False
        if torch_version!='2.11.0+cu130' or not re.fullmatch(r'[0-9a-f]{64}',str(wheel_sha256)):
            return False
        wheel=Path(verified_wheel_path)
        if wheel.name!=TORCH_WHEEL or not wheel.is_file() or hashlib.sha256(wheel.read_bytes()).hexdigest()!=wheel_sha256:
            return False
        if not isinstance(report,dict) or report.get('version') not in ('1',1) or not isinstance(report.get('pip_version'),str) or not isinstance(report.get('environment'),dict):
            return False
        environment=report['environment']
        if environment.get('python_full_version')!=python_version or environment.get('platform_system')!='Linux' or environment.get('platform_machine')!='x86_64' or environment.get('sys_platform')!='linux':
            return False
        if not isinstance(report.get('install'),list) or report.get('uninstall',[])!=[]:
            return False
        torch_installs=[]
        for item in report['install']:
            if not isinstance(item,dict) or not isinstance(item.get('metadata'),dict):
                return False
            metadata=item['metadata']
            if not isinstance(metadata.get('name'),str) or not isinstance(metadata.get('version'),str):
                return False
            name=metadata['name'].lower().replace('_','-')
            if name in installed_packages:
                return False
            download=item.get('download_info')
            archive=download.get('archive_info') if isinstance(download,dict) else None
            hashes=archive.get('hashes') if isinstance(archive,dict) else None
            if not isinstance(download,dict) or not isinstance(download.get('url'),str) or not isinstance(hashes,dict) or not re.fullmatch(r'[0-9a-f]{64}',str(hashes.get('sha256',''))):
                return False
            if name in ('torch','pytorch'):
                torch_installs.append(item)
        if len(torch_installs)!=1:
            return False
        item=torch_installs[0]
        download=item['download_info']
        if download['archive_info']['hashes'].get('sha256')!=wheel_sha256:
            return False
        parsed=urlparse(download['url'])
        if parsed.scheme=='file':
            if Path(unquote(parsed.path)).resolve()!=wheel.resolve():
                return False
        elif parsed.scheme!='https' or parsed.hostname not in {'download.pytorch.org','download-r2.pytorch.org'} or Path(unquote(parsed.path)).name!=TORCH_WHEEL:
            return False
        return item['metadata']['version']==torch_version
    except (OSError, TypeError, ValueError):
        return False


def lock_contains_torch_hash(lock_text, digest):
    if not isinstance(lock_text,str) or not re.fullmatch(r'[0-9a-f]{64}',str(digest)):
        return False
    lines=lock_text.splitlines()
    for index,line in enumerate(lines):
        if re.fullmatch(r'torch==2\.11\.0\+cu130\s*\\?',line.strip()):
            block=[line.strip()]
            cursor=index+1
            while cursor<len(lines) and lines[cursor].strip() and lines[cursor].startswith((' ','\t')):
                if lines[cursor].strip().startswith('#'):
                    break
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
    if parsed.scheme != 'https' or parsed.hostname not in {'download.pytorch.org', 'download-r2.pytorch.org'} or not path.is_file() or Path(unquote(parsed.path)).name != path.name:
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
            generated_scripts=set()
            entry_points_name=next((name for name in archive.namelist() if name.endswith('.dist-info/entry_points.txt')),None)
            if entry_points_name and python_executable and installed_root:
                entry_points=configparser.ConfigParser(interpolation=None)
                entry_points.optionxform=str
                entry_points.read_string(archive.read(entry_points_name).decode())
                if entry_points.has_section('console_scripts'):
                    for script,specification in entry_points.items('console_scripts'):
                        target,separator,callable_name=specification.partition(':')
                        callable_name=callable_name.split('[',1)[0].strip()
                        if not separator or not target.strip() or not callable_name or not re.fullmatch(r'[A-Za-z0-9_.-]+',script):
                            return False
                        import_name=callable_name.split('.',1)[0]
                        # pip versions emit either the legacy regex wrapper or the newer removesuffix wrapper.
                        legacy=(f'#!{python_executable}\n# -*- coding: utf-8 -*-\nimport re\nimport sys\n'
                            f'from {target.strip()} import {import_name}\nif __name__ == \'__main__\':\n'
                            f"    sys.argv[0] = re.sub(r'(-script\\.pyw|\\.exe)?$', '', sys.argv[0])\n"
                            f'    sys.exit({callable_name}())\n')
                        modern=(f'#!{python_executable}\nimport sys\n'
                            f'from {target.strip()} import {import_name}\nif __name__ == "__main__":\n'
                            '    sys.argv[0] = sys.argv[0].removesuffix(".exe")\n'
                            f'    sys.exit({callable_name}())\n')
                        modern_single_quote=modern.replace('"__main__"', "'__main__'").replace('".exe"', "'.exe'")
                        installed_name='../../../bin/'+script
                        path=Path(installed_root)/installed_name
                        contents=path.read_bytes() if path.is_file() else b''
                        if not contents or installed_files.get(installed_name)!=hashlib.sha256(contents).hexdigest() or contents not in (legacy.encode(),modern.encode(),modern_single_quote.encode()):
                            return False
                        generated_scripts.add(installed_name)
            generated={name for name in installed_files if name in {record_name,record_name.replace('/RECORD','/INSTALLER'),record_name.replace('/RECORD','/REQUESTED'),record_name.replace('/RECORD','/direct_url.json')}}
            return checked>0 and set(installed_files)==expected_installed|generated|generated_pyc|generated_scripts
    except (OSError, ValueError, KeyError, StopIteration, zipfile.BadZipFile, EOFError, TypeError, struct.error):
        return False

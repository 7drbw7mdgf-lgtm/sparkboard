"""Publish a verified static release over SFTP; replace the live index last."""
import errno
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

BEGIN = b"# BEGIN SPARKBOARD DEPLOYMENT\n"
END = b"# END SPARKBOARD DEPLOYMENT\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_optional(sftp, name):
    try:
        with sftp.open(name, 'rb') as stream:
            data = stream.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise ValueError('Existing web configuration is unexpectedly large.')
        return data
    except OSError as error:
        if error.errno != errno.ENOENT:
            raise
        return None


def ensure_directory(sftp, directory):
    try:
        sftp.mkdir(directory)
    except OSError:
        if not stat.S_ISDIR(sftp.lstat(directory).st_mode):
            raise ValueError('Deployment path is not a directory.')


def atomic_write(sftp, path, data, release_id):
    temporary = path + '.sparkboard-' + release_id
    with sftp.open(temporary, 'wb') as stream:
        stream.write(data)
    with sftp.open(temporary, 'rb') as stream:
        if digest(stream.read()) != digest(data):
            raise ValueError('Upload checksum mismatch.')
    # Require OpenSSH atomic overwrite support; never remove the current homepage.
    sftp.posix_rename(temporary, path)


def deploy(sftp, build, remote_root='htdocs'):
    build = Path(build)
    manifest = json.loads((build / 'manifest.json').read_text())
    revision, release_id = manifest['revision'], manifest['releaseId']
    if not re.fullmatch(r'[a-f0-9]{40}', revision) or not re.fullmatch(revision + r'-(?:\d+|local)-\d+', release_id):
        raise ValueError('Invalid release identity.')
    # Validate the complete package before any remote mutations.
    entries, seen = [], set()
    for entry in manifest['files']:
        name = entry['path']
        parts = PurePosixPath(name).parts
        if not parts or name.startswith('/') or '\\' in name or '..' in parts or name in seen:
            raise ValueError('Unsafe or duplicate public file path.')
        local = build / 'release' / name
        if local.is_symlink() or not local.is_file():
            raise ValueError('Public file is missing or a symbolic link.')
        data = local.read_bytes()
        if len(data) != entry['size'] or digest(data) != entry['sha256']:
            raise ValueError('Local website checksum mismatch.')
        entries.append((name, local))
        seen.add(name)
    index = (build / 'index.html').read_bytes()
    if 'index.html' not in seen or index != (build / 'release/index.html').read_bytes():
        raise ValueError('Homepage differs from the verified release.')
    configuration = (build / '.htaccess').read_bytes()
    sftp.chdir(remote_root)
    ensure_directory(sftp, '_sparkboard')
    ensure_directory(sftp, '_sparkboard/releases')
    release_path = '_sparkboard/releases/' + release_id
    # A unique run/attempt ID prevents modifying files used by an earlier deployment.
    sftp.mkdir(release_path)
    directories = {release_path}
    for name, local in entries:
        remote = release_path + '/' + name
        parent = PurePosixPath(remote).parent
        for directory in reversed([parent, *parent.parents]):
            directory = str(directory)
            if directory != '.' and directory not in directories:
                ensure_directory(sftp, directory)
                directories.add(directory)
        sftp.put(str(local), remote, confirm=True)
        with sftp.open(remote, 'rb') as stream:
            if digest(stream.read()) != digest(local.read_bytes()):
                raise ValueError('Remote website checksum mismatch.')
    # Keep both prior release directories and the pre-deployment homepage for recovery.
    previous = read_optional(sftp, 'index.html')
    if previous is not None:
        with sftp.open('_sparkboard/previous-index-' + release_id + '.html', 'wb') as stream:
            stream.write(previous)
    existing = read_optional(sftp, '.htaccess') or b''
    if BEGIN in existing:
        before, rest = existing.split(BEGIN, 1)
        if END not in rest:
            raise ValueError('Incomplete managed web configuration block.')
        existing = before + rest.split(END, 1)[1]
    merged = existing.rstrip() + b'\n\n' + BEGIN + configuration.rstrip() + b'\n' + END
    atomic_write(sftp, '.htaccess', merged, release_id)
    with sftp.open(release_path + '/deploy-manifest.json', 'wb') as stream:
        stream.write((build / 'manifest.json').read_bytes())
    atomic_write(sftp, 'index.html', index, release_id)
    return revision


def main():
    import paramiko
    password = os.environ.get('FASTHOSTS_SFTP_PASSWORD', '')
    if not password:
        raise ValueError('Set the FASTHOSTS_SFTP_PASSWORD GitHub environment secret first.')
    root = Path(__file__).resolve().parent.parent
    client = paramiko.SSHClient()
    client.load_host_keys(str(root / 'deploy/fasthosts_known_hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    try:
        client.connect('sftp.sparkboard.co.uk', port=22, username='csh3485371', password=password,
                       look_for_keys=False, allow_agent=False, timeout=25, auth_timeout=25, banner_timeout=25)
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(60)
            revision = deploy(sftp, root / 'build/website')
        print('Published verified website revision ' + revision)
    finally:
        client.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never print connection parameters or library diagnostics containing credentials.
        if isinstance(error, ValueError):
            print(str(error), file=sys.stderr)
        else:
            print('Website deployment failed (' + type(error).__name__ + '). Check hosting access and the pinned host key.', file=sys.stderr)
        sys.exit(1)

"""Read-only diagnostics for the public website; never read credentials or user files."""
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import urllib.error
import urllib.request

import paramiko

PUBLIC_FILES = ('index.html', 'board-model.js', 'src/connector-model.js')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect(sftp, root):
    result = {'root': root, 'canonical': sftp.normalize(root), 'files': {}}
    for name in PUBLIC_FILES:
        try:
            with sftp.open(root + '/' + name, 'rb') as stream:
                data = stream.read(2 * 1024 * 1024 + 1)
            result['files'][name] = {'bytes': len(data), 'sha256': digest(data)}
        except FileNotFoundError:
            result['files'][name] = {'missing': True}
    print(json.dumps(result), flush=True)


def main():
    root = Path(__file__).resolve().parent.parent
    client = paramiko.SSHClient()
    client.load_host_keys(str(root / 'deploy/fasthosts_known_hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    try:
        client.connect('sftp.sparkboard.co.uk', port=22, username='csh3485371',
                       password=os.environ['FASTHOSTS_SFTP_PASSWORD'],
                       look_for_keys=False, allow_agent=False, timeout=25,
                       auth_timeout=25, banner_timeout=25)
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(30)
            print('SFTP home: ' + sftp.normalize('.'), flush=True)
            inspect(sftp, 'htdocs')
            # Inspect directory names only, excluding private files and logs.
            for directory in ('htdocs', 'webapp'):
                try:
                    entries = sftp.listdir_attr(directory)
                    children = [entry.filename for entry in entries
                                if stat.S_ISDIR(entry.st_mode)
                                or stat.S_ISLNK(entry.st_mode)]
                    print(json.dumps({'directory': directory, 'subdirectories': children}), flush=True)
                except FileNotFoundError:
                    print(directory + ': not present', flush=True)
    finally:
        client.close()
    for name in PUBLIC_FILES:
        url = 'https://sparkboard.co.uk/' + name + '?diagnostic=' + os.environ['GITHUB_RUN_ID']
        request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                data = response.read(2 * 1024 * 1024 + 1)
                print(json.dumps({'https': name, 'status': response.status,
                                  'bytes': len(data), 'sha256': digest(data)}), flush=True)
        except urllib.error.HTTPError as error:
            print(json.dumps({'https': name, 'status': error.code}), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Hosting diagnostic failed: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)

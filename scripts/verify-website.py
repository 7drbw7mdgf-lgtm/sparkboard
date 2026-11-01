"""Verify that the public HTTPS origin serves the newly published release."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

SITE = 'https://sparkboard.co.uk'
REVISION_PATTERN = re.compile(r'<meta\b[^>]*\bname=["\']sparkboard-build["\'][^>]*\bcontent=["\']([a-f0-9]{40})["\']', re.I)
BASE_PATTERN = re.compile(r'<base\b[^>]*\bhref=["\']([^"\']+)', re.I)


def read_revision(html):
    match = REVISION_PATTERN.search(html)
    return match.group(1) if match else None


def describe(url):
    """Fetch with TLS checks intact; report only public response metadata."""
    with tempfile.TemporaryDirectory() as directory:
        body_path = Path(directory) / 'body.html'
        headers_path = Path(directory) / 'headers.txt'
        command = [
            'curl', '--location', '--silent', '--show-error', '--max-time', '25',
            '--header', 'Cache-Control: no-cache',
            '--header', 'Pragma: no-cache',
            '--dump-header', str(headers_path),
            '--output', str(body_path),
            '--write-out', '%{http_code}|%{url_effective}|%{remote_ip}', url,
        ]
        try:
            response = subprocess.run(command, capture_output=True, text=True, timeout=35, check=False)
        except (subprocess.TimeoutExpired, OSError) as error:
            return False, f'Fetch failed: {type(error).__name__}'
        body = body_path.read_text(errors='replace') if body_path.exists() else ''
        checksum = hashlib.sha256(body_path.read_bytes()).hexdigest() if body_path.exists() else ''
        info = response.stdout.strip().split('|', 2)
        status, final_url, remote_ip = (info + ['unknown'] * 3)[:3]
        base = BASE_PATTERN.search(body)
        header_lines = headers_path.read_text(errors='replace').splitlines() if headers_path.exists() else []
        cache_headers = [line.strip() for line in header_lines if line.lower().startswith(('cache-control:', 'age:', 'x-cache:'))][-5:]
        revision = read_revision(body)
        description = (
            f'HTTP {status}; destination={final_url}; address={remote_ip}; '
            f'revision={revision or "not found"}; base={base.group(1) if base else "not found"}; '
            f'cache={cache_headers or "not reported"}; sha256={checksum}'
        )
        if response.returncode:
            description += f'; curl error={response.stderr.strip()[:250]}'
        return response.returncode == 0 and status == '200', description


def verify_modules(manifest, prefix):
    files = {entry['path']: entry['sha256'] for entry in manifest['files']}
    for name in ('app.js', 'board-model.js', 'src/connector-model.js'):
        if name not in files:
            raise ValueError('Required public module is missing from the manifest: ' + name)
        ok, description = describe(f'{SITE}{prefix}{name}?deployment={manifest["revision"]}')
        print(f'Public module {name}: {description}', flush=True)
        if not ok or f'sha256={files[name]}' not in description:
            return False
    return True


def verify_sai(manifest):
    """Confirm the bundled Sai HTML and JS really appear at the public subpath."""
    files = {entry['path']: entry['sha256'] for entry in manifest['files']}
    index_name = 'sai/index.html'
    scripts = sorted(name for name in files
                     if name.startswith('sai/assets/') and name.endswith('.js'))
    if index_name not in files or not scripts:
        raise ValueError('Hosted Sai HTML or JavaScript is absent from the release.')
    for name in [index_name, scripts[0]]:
        ok, description = describe(f'{SITE}/{name}?deployment={manifest["revision"]}')
        print(f'Public Sai asset {name}: {description}', flush=True)
        if not ok or f'sha256={files[name]}' not in description:
            return False
    return True


def verify_pulse(manifest):
    """Confirm the pinned Pulse public homepage is served over HTTPS."""
    files = {entry['path']: entry['sha256'] for entry in manifest['files']}
    name = 'pulse/index.html'
    if name not in files:
        raise ValueError('Pulse homepage is absent from the deployment manifest.')
    ok, description = describe(f'{SITE}/{name}?deployment={manifest["revision"]}')
    print(f'Public Pulse homepage: {description}', flush=True)
    return ok and f'sha256={files[name]}' in description


def verify():
    revision = os.environ['EXPECTED_REVISION']
    if not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('Invalid expected commit revision.')
    manifest = json.loads(Path('build/website/manifest.json').read_text())
    if manifest['revision'] != revision:
        raise ValueError('Website manifest revision does not match current commit.')
    release_id = manifest['releaseId']
    if not re.fullmatch(re.escape(revision) + r'-(?:\d+|local)-\d+', release_id):
        raise ValueError('Invalid website release identifier.')

    root = f'{SITE}/?deployment={revision}'
    immutable = f'{SITE}/_sparkboard/releases/{release_id}/index.html'
    direct = manifest.get('layout', 'versioned') == 'direct'
    diagnostic_url = f'{SITE}/src/connector-model.js' if direct else immutable
    max_attempts = 7
    for attempt in range(1, max_attempts + 1):
        url = root + f'&probe={attempt}'
        ok, description = describe(url)
        print(f'Public homepage attempt {attempt}/{max_attempts}: {description}', flush=True)
        if ok and f'revision={revision};' in description:
            prefix = '/' if direct else f'/_sparkboard/releases/{release_id}/'
            if (verify_modules(manifest, prefix)
                    and (os.environ.get('REQUIRE_SAI') != '1' or verify_sai(manifest))
                    and (os.environ.get('REQUIRE_PULSE') != '1' or verify_pulse(manifest))):
                print('HTTPS website, core modules, Sai and Pulse public homepage verified.', flush=True)
                return 0
        if attempt in (1, max_attempts):
            direct_ok, direct_description = describe(diagnostic_url + f'?probe={attempt}')
            print(f'{"Root connector module" if direct else "Immutable release path"}: {direct_description}', flush=True)
            if attempt == max_attempts:
                if not direct and direct_ok and f'revision={revision};' in direct_description:
                    print('The release is reachable at its immutable URL, but the homepage is stale. Check front-end caches or homepage routing.', flush=True)
                else:
                    print('The uploaded website is not being served from this HTTPS origin. Check Fasthosts document root and the domain DNS/hosting mapping.', flush=True)
                _, www_description = describe(f'https://www.sparkboard.co.uk/?deployment={revision}')
                print(f'WWW hostname diagnostic: {www_description}', flush=True)
        if attempt < max_attempts:
            time.sleep(15)
    print('Public HTTPS verification failed. SFTP publication is not proof that the domain serves these files.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    try:
        sys.exit(verify())
    except (ValueError, KeyError, OSError) as error:
        print(f'Website verification error: {error}', file=sys.stderr)
        sys.exit(1)

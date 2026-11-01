"""Verify that the public HTTPS origin serves the newly published release."""

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
        info = response.stdout.strip().split('|', 2)
        status, final_url, remote_ip = (info + ['unknown'] * 3)[:3]
        base = BASE_PATTERN.search(body)
        header_lines = headers_path.read_text(errors='replace').splitlines() if headers_path.exists() else []
        cache_headers = [line.strip() for line in header_lines if line.lower().startswith(('cache-control:', 'age:', 'x-cache:'))][-5:]
        revision = read_revision(body)
        description = (
            f'HTTP {status}; destination={final_url}; address={remote_ip}; '
            f'revision={revision or "not found"}; base={base.group(1) if base else "not found"}; '
            f'cache={cache_headers or "not reported"}'
        )
        if response.returncode:
            description += f'; curl error={response.stderr.strip()[:250]}'
        return response.returncode == 0 and status == '200', description


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
    max_attempts = 7
    for attempt in range(1, max_attempts + 1):
        url = root + f'&probe={attempt}'
        ok, description = describe(url)
        print(f'Public homepage attempt {attempt}/{max_attempts}: {description}', flush=True)
        if ok and f'revision={revision};' in description:
            print('HTTPS website is serving the newly deployed revision.', flush=True)
            return 0
        if attempt in (1, max_attempts):
            direct_ok, direct_description = describe(immutable + f'?probe={attempt}')
            print(f'Immutable release path: {direct_description}', flush=True)
            if attempt == max_attempts:
                if direct_ok and f'revision={revision};' in direct_description:
                    print('The release is reachable at its immutable URL, but the homepage is stale. Check front-end caches or homepage routing.', flush=True)
                else:
                    print('The immutable release is not being served from this HTTPS origin. Check Fasthosts document root and the domain DNS/hosting mapping.', flush=True)
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

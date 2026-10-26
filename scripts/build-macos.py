#!/usr/bin/env python3
"""Build an Apple Silicon app from a clean checkout, with no publisher secrets."""
import argparse
import hashlib
import json
import pathlib
import plistlib
import shutil
import struct
import subprocess
import sys
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
NODE_VERSION = '24.22.1'
NODE_ARCHIVE_SHA256 = '89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7'


def run(*arguments, **kwargs):
    subprocess.run([str(argument) for argument in arguments], check=True, **kwargs)


def obtain_runtime(work):
    """Extract only the two required files from a checksum-pinned official archive."""
    filename = 'node-v{}-darwin-arm64.tar.gz'.format(NODE_VERSION)
    archive_path = work / filename
    if not archive_path.exists():
        temporary = archive_path.with_suffix('.download')
        run('curl', '--fail', '--location', '--max-time', '60',
            'https://nodejs.org/dist/v{}/{}'.format(NODE_VERSION, filename),
            '--output', temporary)
        if hashlib.sha256(temporary.read_bytes()).hexdigest() != NODE_ARCHIVE_SHA256:
            temporary.unlink()
            raise RuntimeError('Official Node archive failed its checksum verification.')
        temporary.rename(archive_path)
    if hashlib.sha256(archive_path.read_bytes()).hexdigest() != NODE_ARCHIVE_SHA256:
        raise RuntimeError('Cached Node archive failed its checksum verification.')
    runtime = work / 'runtime-source'
    (runtime / 'bin').mkdir(parents=True, exist_ok=True)
    prefix = 'node-v{}-darwin-arm64/'.format(NODE_VERSION)
    with tarfile.open(archive_path) as archive:
        for relative in ['bin/node', 'LICENSE']:
            member = archive.getmember(prefix + relative)
            if not member.isfile():
                raise RuntimeError('Unexpected Node runtime archive entry.')
            with archive.extractfile(member) as source:
                (runtime / relative).write_bytes(source.read())
    node = runtime / 'bin/node'
    node.chmod(0o755)
    return node


def validate_runtime(node):
    dependencies = subprocess.check_output(['otool', '-L', str(node)], text=True)
    for line in dependencies.splitlines()[1:]:
        dependency = line.strip().split(' (')[0]
        if not dependency.startswith(('/System/', '/usr/lib/')):
            raise RuntimeError('Use an official self-contained Node runtime, or omit --node. '
                               'External dependency: ' + dependency)
    architecture = subprocess.check_output([str(node), '-p', 'process.arch'], text=True).strip()
    if architecture != 'arm64':
        raise RuntimeError('The desktop app requires an Apple Silicon Node runtime.')
    license_file = node.parent.parent / 'LICENSE'
    if not license_file.is_file():
        raise RuntimeError('The official Node LICENSE must be next to its bin directory.')
    return license_file


def build_icon(work, resources, cache):
    executable = work / 'make-icon'
    run('xcrun', 'swiftc', '-O', '-module-cache-path', cache,
        ROOT / 'desktop/Icon.swift', '-framework', 'AppKit', '-o', executable)
    png = work / 'AppIcon.png'
    run(executable, png)
    iconset = work / 'AppIcon.iconset'
    iconset.mkdir(exist_ok=True)
    for size in [16, 32, 128, 256, 512]:
        for scale in [1, 2]:
            suffix = '@2x' if scale == 2 else ''
            target = iconset / 'icon_{}x{}{}.png'.format(size, size, suffix)
            run('sips', '-z', size * scale, size * scale, png, '--out', target,
                stdout=subprocess.DEVNULL)
    chunks = []
    entries = [('icp4', 'icon_16x16.png'), ('icp5', 'icon_32x32.png'),
               ('icp6', 'icon_32x32@2x.png'), ('ic07', 'icon_128x128.png'),
               ('ic08', 'icon_256x256.png'), ('ic09', 'icon_512x512.png'),
               ('ic10', 'icon_512x512@2x.png')]
    for kind, filename in entries:
        data = (iconset / filename).read_bytes()
        chunks.append(kind.encode() + struct.pack('>I', len(data) + 8) + data)
    body = b''.join(chunks)
    (resources / 'AppIcon.icns').write_bytes(b'icns' + struct.pack('>I', len(body) + 8) + body)


def build_app(work, node):
    runtime_license = validate_runtime(node)
    # This prepares a disposable sandbox key/package. It never needs or replaces
    # the real publisher key committed in update-public-key.pem.
    run(node, ROOT / 'scripts/build.cjs', cwd=ROOT)
    app = work / 'Sparkboard.app'
    if app.exists():
        shutil.rmtree(app)
    contents = app / 'Contents'
    macos = contents / 'MacOS'
    resources = contents / 'Resources'
    web = resources / 'web'
    for directory in [macos, resources / 'runtime', web / 'desktop', web / 'sandbox']:
        directory.mkdir(parents=True, exist_ok=True)
    for filename in ['index.html', 'app.js', 'board-model.js', 'style.css', 'package.json',
                     'server.cjs', 'updater.cjs', 'update-client.js', 'update-client.css',
                     'update-public-key.pem']:
        shutil.copy2(ROOT / filename, web / filename)
    for directory in ['src', 'assets', 'lib']:
        shutil.copytree(ROOT / directory, web / directory)
    shutil.copy2(ROOT / 'desktop/run-desktop.cjs', web / 'desktop/run-desktop.cjs')
    for filename in ['sparkboard-update.json', 'public-key.pem']:
        shutil.copy2(ROOT / '.sparkboard/sandbox' / filename, web / 'sandbox' / filename)
    shutil.copy2(node, resources / 'runtime/node')
    shutil.copy2(runtime_license, resources / 'Node-LICENSE.txt')
    shutil.copy2(ROOT / 'LICENSE', resources / 'LICENSE')
    version = json.loads((ROOT / 'package.json').read_text())['version']
    info = {
        'CFBundleName': 'Sparkboard', 'CFBundleDisplayName': 'Sparkboard',
        'CFBundleExecutable': 'Sparkboard', 'CFBundleIdentifier': 'com.sparkboard.local',
        'CFBundlePackageType': 'APPL', 'CFBundleShortVersionString': version,
        'CFBundleVersion': version, 'CFBundleIconFile': 'AppIcon',
        'LSMinimumSystemVersion': '14.0', 'LSApplicationCategoryType': 'public.app-category.productivity',
        'NSHighResolutionCapable': True, 'NSSupportsAutomaticTermination': False,
        'NSAppTransportSecurity': {'NSAllowsLocalNetworking': True},
        'NSHumanReadableCopyright': 'Copyright 2026 Sparkboard contributors · MIT',
    }
    with (contents / 'Info.plist').open('wb') as stream:
        plistlib.dump(info, stream)
    cache = work / 'ModuleCache'
    cache.mkdir(exist_ok=True)
    run('xcrun', 'swiftc', '-O', '-target', 'arm64-apple-macos14.0',
        '-module-cache-path', cache, ROOT / 'desktop/Launcher.swift',
        '-framework', 'AppKit', '-framework', 'WebKit', '-o', macos / 'Sparkboard')
    build_icon(work, resources, cache)
    run('codesign', '--force', '--sign', '-', '--identifier', 'com.sparkboard.local', app)
    run('codesign', '--verify', '--deep', '--strict', app)
    print('Built {}'.format(app))
    return app


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=pathlib.Path,
                        help='Optional official arm64 Node binary; otherwise download the pinned runtime.')
    parser.add_argument('--work', type=pathlib.Path, default=ROOT / 'build/macos')
    parser.add_argument('--dmg', type=pathlib.Path, help='Also create a compressed DMG at this path.')
    args = parser.parse_args()
    if sys.platform != 'darwin':
        parser.error('The native app build requires macOS and Xcode Command Line Tools.')
    work = args.work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    node = args.node.resolve() if args.node else obtain_runtime(work)
    app = build_app(work, node)
    if args.dmg:
        stage = work / 'image'
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir()
        shutil.copytree(app, stage / app.name)
        (stage / 'Applications').symlink_to('/Applications')
        (stage / 'Read Me.txt').write_text('Drag Sparkboard to Applications. Requires Apple Silicon and macOS 14+.\n'
                                         'Locally signed development build; not Apple-notarized.\n'
                                         'Import browser boards with editable JSON backups.\n')
        destination = args.dmg.resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        run('hdiutil', 'create', '-volname', 'Sparkboard', '-srcfolder', stage,
            '-format', 'UDZO', '-fs', 'HFS+', '-ov', destination)
        run('hdiutil', 'verify', destination)


if __name__ == '__main__':
    main()

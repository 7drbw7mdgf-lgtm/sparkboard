import errno
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('deploy_website', Path(__file__).resolve().parents[1] / 'scripts/deploy-website.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RemoteFile(io.BytesIO):
    def __init__(self, files, path, writing):
        super().__init__(b'' if writing else files[path])
        self.files, self.path, self.writing = files, path, writing

    def close(self):
        if self.writing:
            self.files[self.path] = self.getvalue()
        super().close()


class FakeSFTP:
    def __init__(self, fail_upload=False):
        self.files = {'index.html': b'old working homepage', '.htaccess': b'RewriteEngine On\n'}
        self.directories = set()
        self.events = []
        self.fail_upload = fail_upload

    def chdir(self, directory):
        if directory != 'htdocs':
            raise AssertionError('Unexpected web root')

    def mkdir(self, directory):
        if directory in self.directories:
            raise OSError(errno.EEXIST, 'exists')
        self.directories.add(directory)

    def lstat(self, directory):
        return SimpleNamespace(st_mode=stat.S_IFDIR)

    def open(self, path, mode):
        writing = 'w' in mode
        if writing and self.fail_upload and path.startswith('src/'):
            raise OSError('simulated direct upload failure')
        if not writing and path not in self.files:
            raise FileNotFoundError(errno.ENOENT, 'missing')
        return RemoteFile(self.files, path, writing)

    def put(self, local, remote, confirm=True):
        self.events.append(('upload', remote))
        if self.fail_upload:
            raise OSError('simulated upload failure')
        self.files[remote] = Path(local).read_bytes()

    def posix_rename(self, source, target):
        self.events.append(('publish', target))
        self.files[target] = self.files.pop(source)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.build = Path(self.temp.name)
        (self.build / 'release/src').mkdir(parents=True)
        self.revision = 'a' * 40
        self.release_id = self.revision + '-123-1'
        files = {'index.html': b'new homepage', 'app.js': b'import "./src/example.js";', 'src/example.js':b'export {};'}
        entries = []
        for name, data in files.items():
            (self.build / 'release' / name).write_bytes(data)
            entries.append({'path':name, 'size':len(data), 'sha256':hashlib.sha256(data).hexdigest()})
        (self.build / 'index.html').write_bytes(files['index.html'])
        (self.build / '.htaccess').write_bytes(b'Options -Indexes\n')
        (self.build / 'manifest.json').write_text(json.dumps({'revision':self.revision,'releaseId':self.release_id,'files':entries}))

    def test_release_is_verified_before_switch_and_existing_config_is_preserved(self):
        remote = FakeSFTP()
        self.assertEqual(module.deploy(remote, self.build), self.revision)
        self.assertEqual(remote.events[-1], ('publish', 'index.html'))
        self.assertEqual(remote.files['index.html'], b'new homepage')
        self.assertIn(b'RewriteEngine On', remote.files['.htaccess'])
        self.assertIn(b'Options -Indexes', remote.files['.htaccess'])
        self.assertEqual(remote.files['_sparkboard/previous-index-' + self.release_id + '.html'], b'old working homepage')

    def test_upload_failure_leaves_the_active_site_intact(self):
        remote = FakeSFTP(fail_upload=True)
        with self.assertRaises(OSError):
            module.deploy(remote, self.build)
        self.assertEqual(remote.files['index.html'], b'old working homepage')
        self.assertFalse(any(event[0] == 'publish' for event in remote.events))

    def test_modified_local_files_are_rejected_before_upload(self):
        (self.build / 'release/app.js').write_bytes(b'changed after build')
        remote = FakeSFTP()
        with self.assertRaises(ValueError):
            module.deploy(remote, self.build)
        self.assertEqual(remote.events, [])
        self.assertEqual(remote.directories, set())

    def test_parent_paths_are_rejected_before_upload(self):
        manifest = json.loads((self.build / 'manifest.json').read_text())
        manifest['files'][0]['path'] = '../private.pem'
        (self.build / 'manifest.json').write_text(json.dumps(manifest))
        remote = FakeSFTP()
        with self.assertRaises(ValueError):
            module.deploy(remote, self.build)
        self.assertEqual(remote.events, [])

    def direct_manifest(self):
        manifest = json.loads((self.build / 'manifest.json').read_text())
        manifest['layout'] = 'direct'
        (self.build / 'manifest.json').write_text(json.dumps(manifest))

    def test_direct_upload_updates_root_modules_and_publishes_index_last(self):
        self.direct_manifest()
        remote = FakeSFTP()
        remote.files['.well-known/verification'] = b'keep me'
        module.deploy(remote, self.build)
        self.assertEqual(remote.files['src/example.js'], b'export {};')
        self.assertEqual(remote.files['app.js'], b'import "./src/example.js";')
        self.assertEqual(remote.files['.well-known/verification'], b'keep me')
        self.assertEqual(remote.events[-1], ('publish', 'index.html'))
        self.assertNotIn('_sparkboard/releases', remote.directories)
        self.assertEqual(remote.files['_sparkboard/previous-index-' + self.release_id + '.html'], b'old working homepage')
        self.assertIn(b'RewriteEngine On', remote.files['.htaccess'])

    def test_direct_failure_keeps_old_homepage_and_failed_asset(self):
        self.direct_manifest()
        remote = FakeSFTP(fail_upload=True)
        remote.files['src/example.js'] = b'previous module'
        with self.assertRaises(OSError):
            module.deploy(remote, self.build)
        self.assertEqual(remote.files['index.html'], b'old working homepage')
        self.assertEqual(remote.files['src/example.js'], b'previous module')

    def test_unknown_layout_is_rejected_before_remote_changes(self):
        manifest = json.loads((self.build / 'manifest.json').read_text())
        manifest['layout'] = 'unsupported'
        (self.build / 'manifest.json').write_text(json.dumps(manifest))
        remote = FakeSFTP()
        with self.assertRaises(ValueError):
            module.deploy(remote, self.build)
        self.assertEqual(remote.directories, set())

    def test_live_root_preflight_accepts_only_identical_public_homepage(self):
        remote = FakeSFTP()
        with patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(b'old working homepage')):
            module.verify_live_root(remote)
        with patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(b'different hosting space')):
            with self.assertRaisesRegex(ValueError, 'no website files were changed'):
                module.verify_live_root(remote)
        self.assertEqual(remote.events, [])


if __name__ == '__main__':
    unittest.main()

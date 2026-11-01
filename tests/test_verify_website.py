import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'verify_website', Path(__file__).resolve().parents[1] / 'scripts/verify-website.py'
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class VerificationTests(unittest.TestCase):
    def test_extracts_expected_release_marker(self):
        revision = 'a' * 40
        self.assertEqual(
            module.read_revision('<html><meta name="sparkboard-build" content="' + revision + '"></html>'),
            revision,
        )

    def test_does_not_accept_unrelated_hash(self):
        self.assertIsNone(module.read_revision('<html>' + 'a' * 40 + '</html>'))

    def test_does_not_accept_invalid_version_marker(self):
        self.assertIsNone(module.read_revision('<meta name="sparkboard-build" content="unsupported">'))

    def test_root_modules_must_match_uploaded_hashes(self):
        manifest = {'revision': 'a' * 40, 'files': [
            {'path': name, 'sha256': str(number) * 64}
            for number, name in enumerate(('app.js', 'board-model.js', 'src/connector-model.js'))
        ]}
        with patch.object(module, 'describe', side_effect=[
            (True, 'sha256=' + str(number) * 64) for number in range(3)
        ]) as fetch:
            self.assertTrue(module.verify_modules(manifest, '/'))
            self.assertIn('/src/connector-model.js?', fetch.call_args.args[0])
        with patch.object(module, 'describe', return_value=(False, 'HTTP 404')):
            self.assertFalse(module.verify_modules(manifest, '/'))
        with patch.object(module, 'describe', return_value=(True, 'sha256=old-copy')):
            self.assertFalse(module.verify_modules(manifest, '/'))


if __name__ == '__main__':
    unittest.main()

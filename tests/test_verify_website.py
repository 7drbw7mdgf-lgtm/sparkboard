import importlib.util
from pathlib import Path
import unittest

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


if __name__ == '__main__':
    unittest.main()

import importlib.util
from pathlib import Path
import ftplib
import ssl
import unittest
from unittest.mock import patch, MagicMock

spec = importlib.util.spec_from_file_location(
    'deploy_website_retry', Path(__file__).resolve().parents[1] / 'scripts/deploy-website.py'
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Connection:
    def __init__(self):
        self.ftp = MagicMock()
        self.ftp.pwd.return_value = '/htdocs'

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class RetryTests(unittest.TestCase):
    def test_ftps_eof_reopens_fresh_connection_and_verifies_root_each_time(self):
        sessions = []
        pauses = []

        def factory():
            session = Connection()
            sessions.append(session)
            return session

        with patch.object(module, 'verify_live_root') as verify, patch.object(
            module, 'deploy', side_effect=[ssl.SSLEOFError('closed TLS stream'), 'a' * 40]
        ) as publish:
            revision = module.publish_with_retries(
                factory, Path('build/website'), attempts=3, pause=pauses.append
            )
        self.assertEqual(revision, 'a' * 40)
        self.assertEqual(len(sessions), 2)
        self.assertEqual(verify.call_count, 2)
        self.assertEqual(publish.call_count, 2)
        self.assertEqual(pauses, [2])

    def test_verified_root_mismatch_is_not_retried(self):
        sessions = []
        def factory():
            session = Connection()
            sessions.append(session)
            return session
        with patch.object(
            module, 'verify_live_root', side_effect=ValueError('FTP root does not match live HTTPS')
        ), patch.object(module, 'deploy') as publish:
            with self.assertRaisesRegex(ValueError, 'FTP root'):
                module.publish_with_retries(factory, '.', attempts=4, pause=lambda _: None)
        self.assertEqual(len(sessions), 1)
        publish.assert_not_called()

    def test_repeated_eof_stops_after_bounded_attempts(self):
        sessions = []
        with patch.object(module, 'verify_live_root'), patch.object(
            module, 'deploy', side_effect=ssl.SSLEOFError('closed TLS stream')
        ) as publish:
            with self.assertRaises(ssl.SSLEOFError):
                module.publish_with_retries(
                    lambda: sessions.append(Connection()) or sessions[-1],
                    '.', attempts=3, pause=lambda _: None,
                )
        self.assertEqual(len(sessions), 3)
        self.assertEqual(publish.call_count, 3)

    def test_temporary_data_connection_reply_reopens_the_session(self):
        sessions = []

        def factory():
            session = Connection()
            sessions.append(session)
            return session

        with patch.object(module, 'verify_live_root'), patch.object(
            module, 'deploy', side_effect=[ftplib.error_temp('425 Cannot open data connection.'), 'c' * 40]
        ):
            revision = module.publish_with_retries(
                factory, Path('build/website'), attempts=3, pause=lambda _: None
            )
        self.assertEqual(revision, 'c' * 40)
        self.assertEqual(len(sessions), 2)


class UploadTests(unittest.TestCase):
    def test_data_connection_425_stays_temporary_so_publish_can_retry(self):
        spec = importlib.util.spec_from_file_location(
            'ftps_client_retry', Path(__file__).resolve().parents[1] / 'scripts/ftps_client.py'
        )
        client = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(client)
        ftp = MagicMock()
        ftp.storbinary.side_effect = ftplib.error_temp('425 Cannot open data connection.')
        upload = client.Upload(ftp, 'style.css')
        upload.write(b'body{}')
        with self.assertRaises(ftplib.error_temp):
            upload.close()


if __name__ == '__main__':
    unittest.main()

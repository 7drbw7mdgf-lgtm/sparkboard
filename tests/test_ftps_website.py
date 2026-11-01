import ftplib
import importlib.util
import io
from pathlib import Path
import ssl
import unittest
from unittest.mock import patch, MagicMock

spec = importlib.util.spec_from_file_location(
    'ftps_client', Path(__file__).resolve().parents[1] / 'scripts/ftps_client.py'
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FTPSTests(unittest.TestCase):
    def test_uses_confirmed_master_account_and_verified_tls_for_control_and_data(self):
        ftp = MagicMock()
        with patch.object(module.ftplib, 'FTP_TLS', return_value=ftp) as factory:
            with module.FTPSRemote('test credential') as remote:
                context = factory.call_args.kwargs['context']
                self.assertTrue(context.check_hostname)
                self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
                ftp.connect.assert_called_once_with('ftp.fasthosts.co.uk', 21)
                ftp.login.assert_called_once_with('sparkboard.co.uk', 'test credential')
                ftp.prot_p.assert_called_once()
                remote.chdir('/')
                ftp.cwd.assert_called_once_with('/')
            ftp.close.assert_called_once()

    def test_upload_finalizes_once_and_rename_never_deletes_existing_target(self):
        ftp = MagicMock()
        uploaded = []
        ftp.storbinary.side_effect = lambda command, stream: uploaded.append((command, stream.read()))
        remote = module.FTPSRemote.__new__(module.FTPSRemote)
        remote.ftp = ftp
        with remote.open('src/connector-model.js.pending', 'wb') as stream:
            stream.write(b'new module')
        stream.close()
        self.assertEqual(uploaded, [('STOR src/connector-model.js.pending', b'new module')])
        ftp.rename.side_effect = ftplib.error_perm('550 Cannot replace target')
        with self.assertRaises(ftplib.error_perm):
            remote.posix_rename('pending', 'index.html')
        ftp.delete.assert_not_called()

    def test_missing_and_permission_denied_are_distinguished(self):
        remote = module.FTPSRemote.__new__(module.FTPSRemote)
        remote.ftp = MagicMock()
        remote.ftp.retrbinary.side_effect = ftplib.error_perm('550 No such file')
        with self.assertRaises(FileNotFoundError):
            remote.open('missing.html', 'rb')
        remote.ftp.retrbinary.side_effect = ftplib.error_perm('550 Permission denied')
        with self.assertRaises(ftplib.error_perm):
            remote.open('.htaccess', 'rb')


if __name__ == '__main__':
    unittest.main()

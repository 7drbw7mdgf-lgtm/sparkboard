"""Verified explicit FTPS adapter for Sparkboard's confirmed live FTP root."""
import errno
import ftplib
import io
from pathlib import Path
import ssl
import stat
from types import SimpleNamespace


def transfer_error(action, error):
    code = str(error)[:3]
    detail = 'reply ' + code if code.isdigit() else type(error).__name__
    return ValueError('FTPS ' + action + ' failed (' + detail + ').')


class Upload(io.BytesIO):
    def __init__(self, ftp, name):
        super().__init__()
        self.ftp, self.name = ftp, name

    def close(self):
        if not self.closed:
            try:
                self.seek(0)
                self.ftp.storbinary('STOR ' + self.name, self)
            except ftplib.Error as error:
                raise transfer_error('file upload', error) from None
            finally:
                super().close()


class FTPSRemote:
    def __init__(self, password):
        self.ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=30)
        stage = 'connection'
        try:
            self.ftp.connect('ftp.fasthosts.co.uk', 21)
            stage = 'master-account login'
            self.ftp.login('sparkboard.co.uk', password)
            # Encrypt data connections as well as authentication/control traffic.
            stage = 'encrypted data setup'
            self.ftp.prot_p()
        except ftplib.Error as error:
            self.ftp.close()
            raise transfer_error(stage, error) from None
        except Exception:
            self.ftp.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.ftp.close()

    def chdir(self, directory):
        try:
            self.ftp.cwd(directory)
        except ftplib.Error as error:
            raise transfer_error('destination selection', error) from None

    def mkdir(self, directory):
        try:
            self.ftp.mkd(directory)
        except ftplib.error_perm as error:
            raise OSError(str(error)) from error

    def lstat(self, directory):
        # Used only to confirm an already-existing directory, never to delete it.
        previous = self.ftp.pwd()
        try:
            self.ftp.cwd(directory)
            return SimpleNamespace(st_mode=stat.S_IFDIR)
        finally:
            self.ftp.cwd(previous)

    def open(self, name, mode):
        if mode == 'wb':
            return Upload(self.ftp, name)
        if mode != 'rb':
            raise ValueError('Unsupported remote file mode.')
        data = io.BytesIO()
        try:
            self.ftp.retrbinary('RETR ' + name, data.write)
        except ftplib.error_perm as error:
            data.close()
            message = str(error).lower()
            if message.startswith('550') and any(term in message for term in
                    ('not found', 'no such file', 'does not exist')):
                raise FileNotFoundError(errno.ENOENT, 'Remote public file not found.') from error
            raise transfer_error('public file read', error) from None
        data.seek(0)
        return data

    def put(self, local, remote, confirm=True):
        with Path(local).open('rb') as stream:
            self.ftp.storbinary('STOR ' + remote, stream)
        if confirm:
            self.ftp.voidcmd('TYPE I')
            if self.ftp.size(remote) != Path(local).stat().st_size:
                raise ValueError('FTP upload size mismatch.')

    def posix_rename(self, source, target):
        # Same-directory server rename; no delete-before-replace fallback.
        self.ftp.rename(source, target)

# Automatic Fasthosts deployment

Pushes to `main` run `.github/workflows/deploy-website.yml`. A manual **Run workflow** on `main` is also available. The workflow checks syntax, formatting, tests and packaging before deploying. Pull requests and other branches never deploy.

## One-time setup

1. In GitHub repository Settings → Environments, create `fasthosts-production` and limit deployment branches to `main`.
2. In that environment, add the secret `FASTHOSTS_SFTP_PASSWORD`. Its value is the existing Fasthosts **SSH/SFTP password**, not the control panel password. Enter it directly in GitHub; never put it in source code, a workflow, or an issue. The workflow authenticates as `csh3485371` on `sftp.sparkboard.co.uk:22`, the hosting account configured for Sparkboard.
3. Trigger **Deploy website to Fasthosts** on `main`, or push a change. Check the run reaches the final HTTPS verification step. Missing credentials fail with an actionable message and do not change the live homepage.

The GitHub Actions environment secret is encrypted by GitHub and is passed only to the upload step. Anyone able to change trusted deployment code on `main` could use that credential, so keep repository write access limited. Changing the hosting password requires updating this secret.

## Publishing behavior

`npm run website:build` creates `build/website/` from the existing public-file manifest. It includes only HTML, CSS, frontend modules, media/PDF viewer assets and the MIT license. It excludes Node server code, desktop files, local boards, `.git`, dependencies and publisher signing keys.

Each run uploads a new immutable directory under `htdocs/_sparkboard/releases/<commit>-<run>-<attempt>/`, verifies the transferred file hashes, preserves existing hosting rules and makes the homepage point to that release only after the upload completes. Relative scripts, module imports, fonts and media use the same release through the HTML base URL. Existing open browsers can finish using their old release; refreshing loads the latest successfully published version.

The SFTP server host key is pinned in `deploy/fasthosts_known_hosts`. A changed or unknown key fails closed. Confirm any legitimate hosting key change through Fasthosts before updating that file. The deployer requires the server's OpenSSH atomic-rename support; it never deletes the current homepage to make room for a new one.

The workflow serializes deployments and skips a commit if a newer `main` exists when upload starts. Older release directories and the prior homepage are retained for recovery; nothing in the existing board storage or hosting's certificate verification directory is deleted. Deployment history will consume hosting space until old releases are intentionally removed.

The final check uses normal HTTPS certificate validation and verifies the public page's commit marker. DNS propagation, an inactive certificate or hosting caches can make that step fail even after the SFTP upload succeeded; the job logs distinguish publication from the public check. Do not bypass TLS errors to mark a deployment successful.

## Recovery

Prefer reverting the faulty commit on `main`: the revert creates and deploys a new tested release. The previous homepage is also saved as `htdocs/_sparkboard/previous-index-<new-release-id>.html`, and its referenced old release files remain available. Restoring that file to `htdocs/index.html` through SFTP is a manual recovery option. Older pre-deployment root files are retained as well.

Social-login providers are configured separately in Supabase and in `src/auth-config.js`. A code deployment does not create provider credentials, enable a paused provider or sync users' local boards.

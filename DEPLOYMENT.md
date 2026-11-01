# Automatic Fasthosts deployment

Pushes to `main` run `.github/workflows/deploy-website.yml`. GitHub Actions also offers **Run workflow** on `main`. Checks and builds must pass before publishing; pull requests and other branches never deploy.

## Confirmed live destination

The public site is served by the **FTP master account**:

- Protocol: explicit **FTPS**, with certificate and hostname validation and encrypted data connections.
- Host: `ftp.fasthosts.co.uk`, port `21`.
- Username: `sparkboard.co.uk`.
- Destination: the initial FTP login directory, used as `.`. Do not change to `/` or append `htdocs`: FTP URL `/index.html` is relative to the login directory, not necessarily the server filesystem root.
- GitHub environment: `fasthosts-production`, restricted to `main`.
- Encrypted environment secret: `FASTHOSTS_FTP_PASSWORD`, containing the FTP master password.

This destination was confirmed by downloading FTP URL `/index.html` and comparing its SHA-256 with HTTPS `/index.html`: both were `efa7ba65ea7e9e7d8fe9587ded3199050a0a93720585f3050167d6486451b5d6`. The SFTP account `csh3485371` exposes a different filesystem view and is no longer the publishing destination. Its secret remains separate for read-only diagnostics; changing that SSH password does not update the FTP master password.

Save the FTP secret without putting it into source code, command arguments, issues or chat:

```sh
gh secret set FASTHOSTS_FTP_PASSWORD --env fasthosts-production --repo 7drbw7mdgf-lgtm/sparkboard
```

Enter the password at the hidden prompt. Updating the hosting FTP password requires updating this secret. Anyone who can modify trusted deployment code on `main` can use this credential; keep repository write access limited.

## Publishing behavior

`WEBSITE_LAYOUT=direct npm run website:build` creates `build/website/` using the public-file manifest. Only HTML, CSS, frontend modules, media/PDF assets and the MIT license are included. Node server code, desktop files, `.git`, local boards, dependencies and signing keys are excluded.

Before any writes, deployment compares `index.html` in the FTP login directory with the live HTTPS homepage. A different file means the destination is unconfirmed: publication stops without modifying website files. This check deliberately fails if hosting mapping or caching makes the two views disagree.

The default `direct` layout matches the manual upload: `assets`, `src`, root modules and CSS go directly into the FTP login directory. Each file is staged under a temporary name, read back and checked by SHA-256, then replaced by a same-directory server rename. The deployer never deletes a live file to work around a failed rename. Existing hosting rules and unrelated files are retained. The existing homepage is backed up to `_sparkboard/previous-index-<release-id>.html` within that directory; `index.html` is published last, without a versioned base URL.

Direct uploads replace shared assets individually. Existing browser sessions can briefly see mixed module versions during upload, and interruption can leave some updated assets with the previous homepage. Re-run deployment to finish the set. A homepage backup alone cannot restore overwritten root modules; redeploy the desired source revision for a complete rollback.

The optional manual `versioned` layout uploads immutable files to `/_sparkboard/releases/<commit>-<run>-<attempt>/`, then makes the homepage reference that release. Old release directories are retained. Deployments run serially and skip a superseded commit before upload starts.

The final HTTPS check requires the expected commit marker and matching SHA-256 hashes for `app.js`, `board-model.js` and `src/connector-model.js`. Successful transfer alone is not reported as a live deployment. TLS errors, 404s and stale files fail verification. Never bypass certificate checks to mark a deployment successful.

## Recovery and account setup

Revert a faulty commit on `main` to publish a newly tested file set. Existing saved boards remain in browser storage; deployment does not delete them or hosting certificate verification files. Backups and immutable releases consume hosting space until intentionally removed.

Social-login providers are configured separately in Supabase and `src/auth-config.js`. Deployment does not create provider credentials, enable paused providers, or sync users' local boards. DNS and email records are unchanged by this workflow.

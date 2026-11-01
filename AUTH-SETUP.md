# Social sign-in accounts

Sparkboard uses Supabase Auth for account identity. The static website remains on Fasthosts. Sign-in is disabled until `src/auth-config.js` contains a project URL and public publishable key. The checked-in browser client is built from the official pinned `@supabase/auth-js` package; regenerate it with `npm run vendor:auth`.

## Startup sign-in screen and email links

Sparkboard shows a welcome/sign-in screen to new visitors. Visitors can choose **Continue without an account**, which opens the existing local editor. That guest choice is remembered for the current browser-tab session; signed-in visitors go straight into their workspace. Signing out presents the startup screen again.

The checked-in `src/auth-config.js` enables the email-link option via `emailEnabled: true`. It uses Supabase Auth's `signInWithOtp` email-link flow; Sparkboard does **not** collect or store passwords. To make this feature work in production:

1. Enable the **Email** provider in Supabase Authentication. Configure and verify email delivery (including any SMTP sender, quota, and rate-limit settings needed for your audience). The web UI cannot enable or prove these server-side settings.
2. Under Authentication → URL Configuration, allow `https://sparkboard.co.uk/` as both the Site URL and redirect destination. If users are being sent back to the wrong URL, verify Supabase's redirect allowlist and email template.
3. Confirm that Supabase's confirmation email template sends a link using the configured PKCE redirect/callback flow. Test requesting a link, following it, reload, and sign-out using a dedicated test account.
4. If email sign-in is not ready, set `emailEnabled: false`. Social providers remain controlled by `providers`. With both options disabled, the startup screen clearly says sign-in is unavailable and lets users proceed as guests.

**Important:** Account sign-in now supports **optional cloud board sync**, but only after the server migration in [CLOUD-SYNC-SETUP.md](CLOUD-SYNC-SETUP.md) is installed. Existing guest boards remain local until the user explicitly enables sync from the account dialog. Local copies are **still accessible in this browser profile after sign-out**, so signing out is not a privacy boundary. Failed sync attempts do not remove local boards.

## Project configuration

1. Create a Supabase project in your own organization. Choose a region and plan you approve. Set the database password yourself; it is not used by the website.
2. Under Authentication → URL Configuration, set Site URL to `https://sparkboard.co.uk/`. Allow the exact redirect `https://sparkboard.co.uk/`. Add `https://www.sparkboard.co.uk/` only if that hostname serves the app. For development, explicitly allow `http://localhost:3000/`.
3. In Project Settings → API, find the project URL and **publishable** key. Put only those public values in `src/auth-config.js`. Never use a secret/service-role key, database password, Google client secret, or Facebook app secret in this file.
4. Enable each provider only after its setup below is complete. Set `providers` to the enabled list (`google`, `facebook`, `apple`, `azure`). Microsoft uses the identifier `azure`, not `microsoft`. An empty list disables social buttons; set `emailEnabled: true` to offer email-link login instead. If both options are disabled, the account button is hidden.
5. Upload the rebuilt website package, including `src/vendor/supabase.js` and `src/auth-config.js`, to `htdocs`. Use HTTPS. The callback returns to the app root, so no server routing or PHP callback is needed.

## Google

Create a Google Cloud OAuth web application and configure its consent screen. Use `https://sparkboard.co.uk` as the authorized JavaScript origin. Its authorized redirect URI is `https://PROJECT_REF.supabase.co/auth/v1/callback` (copy the exact callback from the Supabase Google provider settings). Save the Google client ID and client secret in Supabase's Google provider settings only. Publish the consent screen for public users; while in testing, only authorized test users may sign in.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-google

## Facebook

Create a Meta developer app supporting Facebook Login. Configure the website URL, app domain, privacy policy URL, data deletion instructions/callback and the valid OAuth redirect URI from Supabase (`https://PROJECT_REF.supabase.co/auth/v1/callback`). Save its App ID and App Secret in Supabase's Facebook provider settings only. Complete Meta's required checks and enable the app for public users. Development-mode login is limited to the app's authorized roles/testers. Provide actual privacy and deletion information matching your service before launch.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-facebook

## Microsoft

Register a web app named Sparkboard in a Microsoft Entra directory you control. For a public app accepting both work/school and personal accounts, choose the matching multi-tenant plus personal supported-account option, subject to your directory permissions. Use the Web redirect URI `https://ocftoznoinuvdrfayhpf.supabase.co/auth/v1/callback`. No Microsoft Graph mail, contacts, files or administrative permissions are needed for account identity.

Create a client secret, keep its value out of source control, and enter it with the Application (client) ID in Supabase Authentication → Providers → Azure. Leave the tenant URL at the common tenant for a multi-tenant plus personal app, or configure the appropriate tenant/consumers URL if limiting accounts. Request the `email` scope (the frontend does this). Configure the optional `email` and `xms_edov` claims as described in Supabase's guide to support verified email handling. Track the secret expiry and rotate it before expiration.

Enable the Azure provider in Supabase and add `azure` to `src/auth-config.js` only after this is complete. Registering an app in an employer/university directory needs authorization from that directory's owner; a signed-in session does not guarantee permission to register public apps there.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-azure

## Apple

Use an Apple Developer account with access to Certificates, Identifiers & Profiles. Configure an App ID with Sign in with Apple enabled, then a Services ID for the website linked to that App ID. Add the Supabase callback host `ocftoznoinuvdrfayhpf.supabase.co` as a web domain and `https://ocftoznoinuvdrfayhpf.supabase.co/auth/v1/callback` as the return URL.

Create a Sign in with Apple signing key and retain its `.p8` file securely. Use the team ID, key ID, Services ID and signing key to generate the Apple OAuth client-secret JWT. Put the Services ID and generated secret in Supabase's Apple provider settings, never in the website. The web OAuth secret expires after at most six months and must be regenerated before expiry. Do not buy a developer membership as part of setup without the owner's approval.

Enable the Apple provider in Supabase and add `apple` to `src/auth-config.js` once credentials and domains are ready. Apple may only return a user's name on their first authorization; the UI falls back to the email/account label when no name is available.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-apple

## Verification

Test every enabled provider on the HTTPS domain using separate test accounts: first sign-in creates an account; returning sign-in restores the same account; cancelling returns to a usable board; refresh restores the session; sign out removes the session from this browser; sign out is reflected in another open tab. Check any provider error in the Supabase Auth logs without sharing access tokens.

The implementation uses PKCE, removes callback codes/errors from the address bar, and saves pending board changes before navigating to the provider. The SDK stores the account session in browser storage and refreshes it. No provider access token is needed by Sparkboard.

## Storage scope and cross-device sync

Supabase Auth identifies the user. **Opt-in** cloud board sync requires installing `supabase/migrations/20261101000000_board_sync.sql` in the configured Supabase project, verifying authenticated row-level security and testing with two devices. Use [CLOUD-SYNC-SETUP.md](CLOUD-SYNC-SETUP.md) for the activation, conflict handling and privacy limitations. Do not describe sync as enabled merely because the static website has been published.

Signed-out and other browser users can still access local board caches, even after sync was previously enabled. Users should explicitly export, clear their browser data or use separate profiles for sensitive work.

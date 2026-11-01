# Cross-device board sync (opt-in)

Sparkboard is still local-first. Boards save to this browser's IndexedDB whether or not Supabase is reachable. Signed-in members can **opt in** to cloud sync for their own boards, then access them on another device with the same Supabase account.

## Server prerequisite — do not skip

The public site already has a Supabase Auth project configured in `src/auth-config.js`, but an Auth login does **not** create any database tables. Before shipping or claiming cross-device sync is operational:

1. In the Supabase project whose URL appears in `src/auth-config.js`, open **SQL Editor** or use the Supabase CLI migration process.
2. Apply `supabase/migrations/20261101000000_board_sync.sql`. It creates `public.sparkboard_boards` with per-user row-level security (RLS), authenticated-only SELECT/INSERT/UPDATE and a hard JSON size limit.
3. Check that **Email** Auth and the `https://sparkboard.co.uk/` callback redirect are working. Never expose a Supabase service-role/secret key in frontend code. The checked-in `sb_publishable_` key is public.
4. Test with two separate Supabase accounts: one account must **not** read another account's boards. Test on two devices signing into the same account.
5. Confirm with a test board that edit, rename, refresh, attachment import (under the 7 MB per-board limit), offline editing, conflict copies and delete-tombstone propagation all work before describing the service as fully production tested.

Supabase SQL Editor/CLI credentials and migrations cannot be inferred from GitHub. Deployment of the static Fasthosts site alone does not create the table. If the table is absent, the UI shows a setup error and leaves boards saved locally.

## User workflow

1. Sign in using the same email-link or configured social identity on both devices.
2. Open the **Account** menu and choose **Enable cloud sync on this browser**. This explicitly uploads existing local/guest boards for that account. Sign-in on its own does not upload existing local boards.
3. On the second device, enable sync as well. Remote boards appear in the board library. Subsequent changes sync automatically (after local saves and periodic refresh); use **Sync now** for an immediate attempt.
4. To stop this browser communicating with the cloud, choose **Pause cloud sync on this browser**.

The interface must never say “synced” on a failed request: authentication errors, unavailable migrations, quota failures and network failures leave local copies intact and show a paused/error status.

## Conflict handling

Cloud rows use `(owner_id, board_id)` as a composite key, with an integer `version`. Every update and deletion is conditional on the last-read version. This prevents a second device from silently overwriting a newer cloud version. When the remote revision changed independently, Sparkboard preserves the local edits as a **(conflict copy)** and loads the latest server version. Deletions use versioned tombstones to avoid resurrecting deleted boards. This is periodic document sync, **not realtime multiuser co-editing / CRDT merging**.

Local metadata remembering the last uploaded version is stored in this browser. Clearing browser storage removes that metadata; existing remote boards are imported without destructive overwrites if the same ID is also present locally.

## Limits and privacy

- Each board snapshot (including any base64 embedded images/PDFs) is capped at **7 MB** in the client. Oversized boards remain local and show a sync error. The SQL constraint enforces an 8 MiB upper bound independently. Large-media storage buckets, quotas, and production-scale performance are follow-up work.
- Board contents sent to Supabase are **not end-to-end encrypted**. Supabase's Auth JWT and row-level security enforce account ownership; TLS protects transfer. Access policies must be verified before production use.
- **Local IndexedDB boards remain available on this browser after sign-out.** Local board visibility is not an authentication/privacy boundary: use a private browser profile or clear this device's local storage if that matters, after exporting or syncing important boards.
- Signing into a different account does not automatically upload boards tagged as owned by a different account.
- Signed-in **guest** boards are included only when the user explicitly enables sync. The SQL migration has to exist; a green GitHub/Fasthosts deployment alone is not enough.
- Boards are not continuously protected by a server-side backup retention policy. Export JSON backups before major changes. Cloud sync is not a substitute for versioned backups.

## Verification checklist

Use Supabase's SQL Editor to verify RLS is enabled, that `anon` has no table grants and each policy is restricted to `auth.uid() = owner_id`. Test denial with a second authenticated user; test GET, POST, conditional PATCH, tombstone and error paths. Only then mark the cross-device feature production-ready.

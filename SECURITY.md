# Security

## Reporting a problem

Please report security problems privately through GitHub's **Report a vulnerability** button on the repository's Security tab, not in a public issue. You will get a reply within a few days.

## What is and is not secret

- **Google OAuth client ID** (`VITE_GOOGLE_CLIENT_ID`): public by design. It ships in the page and only works from the sites listed under *Authorized JavaScript origins* in your Google Cloud project.
- **Google OAuth client secret** (`GOOGLE_CLIENT_SECRET`): secret. It is only ever read by the Cloudflare Pages Function in `functions/` and must be set as a Pages secret, never committed and never put in a `VITE_` variable (those end up in the page).
- **The renewal key** that keeps a person signed in lives in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/google`. Page scripts cannot read it.
- Notes, tasks, reminders and settings stay in the visitor's own browser (`localStorage`). Nothing is sent to a server of ours.
- The app asks Google for one read-only permission: `youtube.readonly`.

## Before you publish your own copy

1. Create your own OAuth client; do not reuse someone else's.
2. Keep `.env`, `.env.local` and any file holding the client secret out of git (they are in `.gitignore`).
3. If a secret is ever committed, rotate it in Google Cloud first, then clean the history.

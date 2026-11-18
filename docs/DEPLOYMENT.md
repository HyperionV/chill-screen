# Deploying ChillScreen

ChillScreen is a static web app (Vite + TypeScript, drawn on a canvas) with one optional serverless function. You can run it on your laptop, put the `dist` folder on any static host, or deploy it to Cloudflare Pages, which is what the project uses and the only host that also runs the optional "stay signed in" function.

| You want | Do this | Needs |
|---|---|---|
| Try it | [Run locally](#run-locally) | Node 22 |
| Use it every day, free | [Cloudflare Pages](#deploy-to-cloudflare-pages) | A Cloudflare account |
| YouTube playlists and search | [Google sign-in](#set-up-google-sign-in) | A Google Cloud project |
| Sign-in that lasts | [Keep people signed in](#keep-people-signed-in) | The OAuth client secret as a Pages secret |

Everything except music works with no setup at all. Pasting a YouTube playlist link works without Google.

## Run locally

```bash
git clone https://github.com/HyperionV/chill-screen.git
cd chill-screen
npm install
npm run dev          # http://localhost:4173
```

Other commands:

```bash
npm run check        # strict TypeScript
npm test             # unit tests
npm run build        # type-check, then build into dist/
npm start            # serve dist/ at http://localhost:4173
```

## Set up Google sign-in

Only needed for "Sign in with Google" (your own playlists, liked videos and search). Skip it if pasting playlist links is enough.

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project.
2. **APIs & Services → Library**: enable **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen**: choose *External*, fill in the app name and your email, add the scope `https://www.googleapis.com/auth/youtube.readonly`, and add your own Google account under *Test users*.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorized JavaScript origins** add every address the app runs on, for example:
   - `http://localhost:4173`
   - `https://your-project.pages.dev`
   - `https://your-own-domain.example`
5. Copy the **Client ID**. It is public by design.
6. Give it to the build:

   ```bash
   cp .env.example .env.local
   # then edit .env.local:
   # VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

   The ID is baked into the page when you build, so rebuild after changing it. If you leave it empty, the Music panel shows a small setup guide where a visitor can paste their own client ID on their own machine.

Notes on Google's side:

- **Quota.** The YouTube Data API starts with a daily allowance (10,000 units; a search costs far more than listing playlists). When it runs out the app says so and it resets at midnight Pacific time.
- **Testing vs production.** While the consent screen is in *Testing*, only the listed test users can sign in. Moving it to *In production* lets anyone sign in, but because `youtube.readonly` is a sensitive scope Google shows an "unverified app" warning until you pass its verification.

## Deploy to Cloudflare Pages

### With the command line

```bash
npm run build                      # needs .env.local with the client ID if you want Google sign-in
npx wrangler login                 # once
npx wrangler pages project create chillscreen --production-branch main   # once
npx wrangler pages deploy dist --project-name chillscreen --branch main
```

Wrangler also uploads the `functions/` folder automatically. Your site is then live at `https://chillscreen.pages.dev` (or the name you chose).

### With Git

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick your fork, and use:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |
| Environment variable | `VITE_GOOGLE_CLIENT_ID` = your client ID (optional) |

Every push to `main` then deploys.

### Your own domain

In the Pages project, **Custom domains → Set up a domain**, and follow the DNS steps. Then add the new address to **Authorized JavaScript origins** in Google Cloud (step 4 above), or sign-in will fail on that address.

## Keep people signed in

Google's browser-only sign-in hands out a pass that lasts **one hour** and cannot renew itself quietly. Without more, music sign-in expires hourly. ChillScreen fixes this with a small Cloudflare Pages Function (`functions/api/google/[action].ts`) that keeps a long-lived renewal key in a cookie the page cannot read, and fetches a new hour-long pass whenever one is needed.

To turn it on:

1. In Google Cloud, open your OAuth client and copy the **Client secret**.
2. Store it as a Pages secret (it is never committed and never put in the page):

   ```bash
   npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name chillscreen
   ```

   or in the dashboard under **Settings → Variables and Secrets** as an encrypted variable.
3. Deploy again (secrets apply to the next deployment).
4. Sign in once more. From then on the cookie renews the sign-in for months.

How to check it: open `https://your-site/api/google/status`. It answers `{"configured":true}` when the secret is in place, and `{"configured":false}` when it is not (the app then simply uses the one-hour sign-in).

How it works, briefly:

- The sign-in window returns a one-time code. The function trades it with Google for a pass and a renewal key, sends the pass to the page and stores the key in an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/google`.
- `/api/google/token` uses that cookie to get a fresh pass. If Google says the key is dead (revoked or expired) the cookie is cleared and the person signs in again; a passing Google outage does not sign anyone out.
- `/api/google/signout` tells Google to drop the key and clears the cookie.
- Every call needs a custom header, so another website cannot trigger it.

Two limits from Google, not from the app:

- While the consent screen is in **Testing**, Google ends renewal keys after **7 days**. Publish the app to *In production* to avoid it.
- A person who removes the app in their Google account settings is signed out everywhere.

To test the function locally, create a `.dev.vars` file (git-ignored) with `GOOGLE_CLIENT_SECRET=...` and run `npx wrangler pages dev dist`, using an address you listed under Authorized JavaScript origins.

## Other hosts

`npm run build` produces a plain static site in `dist/`, so Netlify, Vercel, GitHub Pages or any web server will serve it. The `functions/` folder is Cloudflare-specific, so on other hosts music sign-in uses the one-hour pass. If the site is served from a sub-path (as on GitHub project pages), add a `vite.config.ts` that sets `base` to that path or the assets will not load. Remember to add the final address to Authorized JavaScript origins.

## Privacy

The deployed site collects nothing. Notes, tasks, reminders and settings stay in each visitor's browser. The page talks to YouTube (player and thumbnails), Google (sign-in) and, only if you set the secret, its own `/api/google` function.

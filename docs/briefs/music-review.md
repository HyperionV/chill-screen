# Brief: second review of the new music player (read-only)

The uncommitted changes add a Music panel to ChillScreen, a browser app: Google sign-in (token flow, read-only YouTube scope), the YouTube Data API for playlists and search, and YouTube's embedded player. Files: `src/music/music-player.ts`, `src/music/vendor.d.ts`, `src/ui/music*.ts`, `src/ui/music.css`, `src/ui/panel.ts` (panels now stay in the page when another opens), `src/ui/app.ts`. Existing, already reviewed: `src/music/google-auth.ts`, `src/music/youtube-api.ts`.

Look for real defects only, in this order:
1. A sign-in or token path that can hang, loop, or leave the panel on a wrong screen (silent sign-in on open, sign out, change client ID, closed Google window).
2. The player: state that gets stuck (playing flag vs. what YouTube reports), skipping of unplayable videos looping forever, a second player created, an unhandled rejection.
3. Memory or timers that leak (intervals not cleared, listeners added repeatedly, object URLs).
4. Anything that could send the user's data anywhere other than Google and YouTube.

Do not suggest style changes, extra features or tests. Each finding: file:line, what goes wrong, and the exact steps that trigger it. Say what you did not check.

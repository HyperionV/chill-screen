# Using ChillScreen

ChillScreen is made to sit on a second monitor (or a spare tab) while you work. Open it, pick a scene, and leave it. Everything you set is remembered in your browser, so you never set it up twice.

## First minute

1. Open the app: a small toolbar sits at the bottom with the **Zen / Business** switch and the **settings** (sliders) button.
2. Press the settings button, pick a **Scene**, then a journey or landscape.
3. Press the **Zen / Business** switch to hide everything but the picture, or to bring the notes and tasks back.
4. Press `F11` (or your browser's full-screen) for the full window.

The picture is always a view through a window, with a clock in the middle. Weather and the time of day change the picture and the light.

## Scenes

| Scene | What it is |
|---|---|
| **Journey** | A long trip that never ends, in chapters: a road through six countries, a sleeper train, a canal barge, a rainy night bus, a jungle river, an airship, a fairy road. |
| **Landscape** | A place that stays put but is deep and alive, with several scenes you drift through: seaside, pine forest, mirror lake, cherry blossom grove, fishing spot, interstellar, alpine peak, snowy cabin, zen garden, rooftop city. |
| **Wallpapers** | Your own pictures, shown as a slideshow behind the window. They stay on your device. |
| **Aquarium** | A small pixel tank with fish, snails and shrimp that live on their own. |

Each journey and landscape has a one-line hint in the picker saying what the pointer and clicks do. In general: move the mouse to stir the animals, click things that look clickable (lamps, birds, bells, boats), and wipe the rain off the glass by moving across it.

A few trips run their own sky (the night train, the rainy night bus and interstellar). They ignore the Time control.

## Settings

Open them with the sliders button next to Zen and Business. Three icons in the panel's header open small pop-ups for **View** (eye), **Fonts** (T) and **Time** (clock).

- **Scene** and the journey or landscape list, as above.
- **Pace** (journeys): Still, Slow, Gentle or Brisk.
- **Sound**: a soft ambience made in the browser (no audio files). Off, Soft, Medium, Full. Browsers only allow sound after your first click or key press.
- **Rain**: None, Drizzle, Rain, Downpour. Rain collects on the glass and the clock sits behind it.
- **Time of day** (clock icon in the header): a 24-hour slider and a speed: Live, Pause, 1x, 10x, 60x or 360x, like a day/night cycle in a game. Use it to check how a scene looks at dawn, noon, dusk and night.
- **Fonts** (T icon): Pixel, Clean, Serif or Mono, with separate sizes for the clock and for the cards.
- **View** (eye icon): keep or hide the window frame.
- **Wallpapers**: add pictures, choose one, and decide whether they stay, shuffle or go in order, every 1, 3, 10 or 30 minutes.

## Zen and Business

- **Zen** shows only the scene, with the toolbar at the bottom. The clock button on the toolbar opens the focus timer as a small floating card.
- **Business** adds your cards: **Notes** and the **Focus** timer on the left, **Tasks** and **Reminders** on the right.

## Cards

- **Notes**: one scratchpad that saves itself as you type.
- **Tasks**: type, press Enter, tick off, clear what is done.
- **Reminders**: set a time and a note; a quiet banner and a chime appear when it is due. Reminders only fire while the ChillScreen tab is open. A hidden or minimised tab may delay them, so keep it on a visible screen.
- **Focus timer**: a pomodoro timer with 25/5 and 50/10 presets (or your own minutes), a count of sessions today, and its own soft background sound.

## Music

There are two ways to play music, and both use the pixel radio on the window sill.

1. **Paste a playlist link.** Press the link button, paste any YouTube playlist link, then Play or Shuffle. No account needed.
2. **Sign in with Google** to browse your own playlists and liked videos and to search. ChillScreen only asks for read-only access to your YouTube account and can change nothing. On a site with persistent sign-in enabled (see [DEPLOYMENT.md](DEPLOYMENT.md)) you stay signed in for months; otherwise Google asks again after about an hour.

Hover the song name on the radio to see a slider and skip within the track. Music plays through YouTube's own player, so YouTube's terms and ads apply as usual.

## Shortcuts for sharing and testing

You can add these to the address:

| Parameter | Example | Effect |
|---|---|---|
| `journey` | `?journey=night-train` | Open a specific journey: `wildwood`, `night-train`, `canal`, `night-bus`, `jungle`, `sky`, `fairy`. |
| `landscape` | `?landscape=cherry-grove` | Open a specific landscape: `seaside`, `pine-forest`, `mirror-lake`, `cherry-grove`, `fishing-spot`, `interstellar`, `alpine-peak`, `snowy-cabin`, `zen-garden`, `rooftop-city`. |
| `chapter` | `?chapter=2.5` | Jump to a point in a journey or landscape (the whole number is the chapter). |
| `hour` | `?hour=21` | Set the time of day for this visit. |

## Install it like an app

ChillScreen is a web app with a manifest. In Chrome or Edge use *Install* in the address bar menu to get its own window without tabs, which is ideal for a second screen.

## Your data

Notes, tasks, reminders, timer, settings and wallpapers stay in your browser (`localStorage` and IndexedDB). Clearing site data resets them. Nothing is sent to a server of ours. The only outside services are YouTube (player, thumbnails, your playlists if you sign in) and Google sign-in.

## Troubleshooting

- **No sound**: click anywhere or press a key once; browsers block sound before that.
- **Music asks me to sign in again**: without persistent sign-in, Google's browser-only pass lasts one hour. See [DEPLOYMENT.md](DEPLOYMENT.md#keep-people-signed-in).
- **A scene feels slow**: lower the browser zoom or close other heavy tabs. Scenes are drawn at a small size and scaled up, and aim for 30 frames a second.
- **Sign-in window is blocked**: allow pop-ups for the site.

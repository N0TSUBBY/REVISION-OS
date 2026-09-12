# REVISION-OS

REVISION-OS is a static browser desktop simulation for revision/study workflows.

## Run locally

Open `/home/runner/work/REVISION-OS/REVISION-OS/index.html` in a browser, or serve the folder with any static server.

## Included desktop apps

- Spotify (OAuth + Web Playback SDK controls)
- In-app Browser (`iframe` with embed-block fallback)
- Discord widget/embed + connect link
- Past GCSE papers browser with filtering/search
- Whiteboard (pen, eraser, clear)
- Calculator (normal/scientific toggle)
- Settings (theme/accent/background/account config + Zen mode)

## Notes

- All shell/app visuals are theme-driven via CSS variables.
- Theme, accent, background, Zen mode, and window layout are persisted in `localStorage`.
- For Spotify OAuth, set a Spotify Client ID in Settings and configure your Spotify app redirect URI to the current page URL.
- Discord embed requires a server widget ID in Settings.

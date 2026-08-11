# Juicy (irgenius.org/Juicy)

Kid-friendly video picker for granddaughter learning videos.

## Add your videos

Edit `static/Juicy/videos.json`.

For a YouTube video, paste only the video id (the part after `v=`):

```json
"youtube": "dQw4w9WgXcQ",
"mp4": ""
```

For a local/hosted mp4, put the file in `static/Juicy/videos/` and set:

```json
"youtube": "",
"mp4": "./videos/alphabet.mp4"
```

If both are set, **mp4 wins**.

Large mp4 files are usually better on Cloudflare R2 / object storage than in git. You can still paste a full `https://...mp4` URL in the `mp4` field.

## How she uses it

1. Open `/Juicy/`
2. Press **1–9** on the big buttons or the keyboard
3. The video plays and the play count goes up

## Watch counts

- Counts save on the device immediately (`localStorage`)
- Grown-up view: `/Juicy/stats.html`
- Optional shared counts (so you can check from your phone): deploy `workers/juicy-count.js` as a Cloudflare Worker with KV binding `JUICY_COUNTS`, route `irgenius.org/api/juicy-count*`

## Local preview

If Hugo is installed:

```bash
hugo server
```

Then open http://localhost:1313/Juicy/

Or open `static/Juicy/index.html` via any static file server.

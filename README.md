# FFmpeg Puzzle Game

Single-screen MVP for a browser puzzle where the viewport is rendered entirely with `ffmpeg.wasm`.

## Stack

- React 19
- Vite 8
- TypeScript
- `@ffmpeg/ffmpeg`
- GitHub Pages deployment

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
```

## Deployment

The app is configured for GitHub Pages under the `/ffmpeg-puzzle-game/` base path. The workflow in [`.github/workflows/deploy.yml`](/home/spectrum/projects/ffmpeg-puzzle-game/.github/workflows/deploy.yml) builds the static site and publishes it with GitHub Actions.

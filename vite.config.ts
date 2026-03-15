import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getProductionBase() {
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  return repository ? `/${repository}/` : '/ffmpeg-puzzle-game/'
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? getProductionBase() : '/',
  plugins: [react()],
}))

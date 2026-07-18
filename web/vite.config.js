// --- web/vite.config.js ---

import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Railway (and most PaaS) assign a dynamic *.up.railway.app domain — Vite's
  // preview server rejects unknown Host headers by default, so it must be allowed explicitly.
  preview: {
    allowedHosts: true,
  },
})

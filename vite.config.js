import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Brauzerdan to'g'ridan-to'g'ri tender API'lariga so'rov yuborib bo'lmaydi:
// ular `origin`/`referer` ni tekshiradi va CORS bilan bloklaydi.
// Shu sabab dev rejimida Vite proxy orqali so'rov yuboramiz — Vite server
// tomonda so'rovni qayta jo'natadi va kerakli header'larni to'g'rilaydi.
//
// Frontend `/proxy/uzex/...` ga so'rov qiladi -> Vite uni
// `https://apietender.uzex.uz/...` ga jo'natadi.
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/proxy/uzex': {
        target: 'https://apietender.uzex.uz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/uzex/, ''),
        headers: {
          origin: 'https://etender.uzex.uz',
          referer: 'https://etender.uzex.uz/',
        },
      },
      '/proxy/hayotbirja': {
        target: 'https://api.hayotbirja.uz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/hayotbirja/, ''),
        headers: {
          origin: 'https://hayotbirja.uz',
          referer: 'https://hayotbirja.uz/',
        },
      },
    },
  },
})

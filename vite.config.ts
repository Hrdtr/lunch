import vue from '@vitejs/plugin-vue'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  plugins: [
    vue(),
    AutoImport({
      dts: true,
      dirs: ['./src/composables', './src/utils'],
      imports: ['vue', '@vueuse/core'],
    }),
    Components({
      dts: true,
    }),
  ],
}))

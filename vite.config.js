import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    base: '/threejs-charging-station-showcase/', // github pages，需将静态资源的绝对路径改成相对路径
    build: {
      outDir: 'docs', // github pages
      rolldownOptions: {
        output: {
          minify: {
            compress: {
              dropConsole: command === 'build', // 生产环境去除console
              dropDebugger: command === 'build', // 生产环境去除debugger
            }
          }
        }
      }
    }, 
    copyPublicDir: true,
  }
})

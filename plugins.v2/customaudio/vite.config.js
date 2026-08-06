import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'customaudio',
      filename: 'remoteEntry.js',
      exposes: {
        './Config': './src/components/Config.vue',
        './Page': './src/components/Page.vue',
      },
      shared: {
        vue: {
          requiredVersion: false,
          generate: false,
        },
      },
      format: 'esm',
    }),
  ],
  build: {
    target: 'esnext',
    minify: true,
    cssCodeSplit: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: atRule => {
              if (atRule.name === 'charset') {
                atRule.remove()
              }
            },
          },
        },
        {
          postcssPlugin: 'vuetify-filter',
          Root(root) {
            root.walkRules(rule => {
              if (!rule.selector) return
              const kept = []
              for (const sel of rule.selectors) {
                // 仅删除首个简单选择器为 vuetify 组件类且非 scoped 的 selector，
                // 避免误删自定义规则中引用 .v- 类名的选择器（如 .ca-input-group > .v-input）
                const first = sel.trim().split(/[\s>+~]/)[0]
                if (/^\.(v-|mdi-)/.test(first) && !sel.includes('[data-v')) {
                  continue
                }
                kept.push(sel)
              }
              if (kept.length === 0) {
                rule.remove()
              } else if (kept.length !== rule.selectors.length) {
                rule.selector = kept.join(',')
              }
            })
          },
        },
      ],
    },
  },
})

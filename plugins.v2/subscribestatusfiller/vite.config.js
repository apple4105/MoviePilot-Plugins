import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'subscribestatusfiller',
      filename: 'remoteEntry.js',
      exposes: {
        './Config': './src/components/Config.vue',
        './Page': './src/components/Page.vue',
        './AppPage': './src/components/AppPage.vue',
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
              // 仅删除 Vuetify 全局样式（不含 :deep 的规则，如 .v-application、.v-table 等顶层类）；
              // 组件 scoped 样式里的 :deep(.v-xxx) 引用必须保留（scoped 重写在 postcss 之后才发生，
              // 此时选择器仍为 .ssf-table :deep(.v-table__wrapper td)，没有 data-v 属性可判断）
              if (rule.selector && !rule.selector.includes(':deep') && (rule.selector.includes('.v-') || rule.selector.includes('.mdi-'))) {
                rule.remove()
              }
            })
          },
        },
      ],
    },
  },
})

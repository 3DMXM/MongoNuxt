// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    "@pinia/nuxt",
    "@nuxt/ui",
    "@element-plus/nuxt",

  ],
  ui: {
    fonts: false
  },
  css: ['~/assets/css/main.css'],
  ssr: process.env.NODE_ENV !== "development",
})

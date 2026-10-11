import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { DEFAULT_APPLICATION_LANGUAGE } from '../../shared/application-language.ts'
import { initializeI18n } from './i18n'

async function startRenderer(): Promise<void> {
  try {
    initializeI18n(await window.api.preferences.getLanguage())
  } catch {
    initializeI18n({
      status: 'error',
      language: DEFAULT_APPLICATION_LANGUAGE,
      code: 'preferences-unavailable'
    })
  }

  createApp(App).mount('#app')
}

void startRenderer()

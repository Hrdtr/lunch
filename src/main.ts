import { init, postEvent, retrieveLaunchParams, viewport } from '@telegram-apps/sdk'
import { createNotivue } from 'notivue'
import { neutral as colorNeutral } from 'tailwindcss/colors'
import { createApp } from 'vue'
import App from './app.vue'

import './style.css'
import 'notivue/notification.css'
import 'notivue/animations.css'

const app = createApp(App)

try {
  app.use(() => {
    init()

    const launchParams = retrieveLaunchParams()
    app.provide('telegram', {
      launchParams,
    })

    const preferredDark = usePreferredDark()
    watch(preferredDark, (value) => {
      postEvent('web_app_set_header_color', { color: value ? colorNeutral[900] : colorNeutral[100] })
    }, { immediate: true })

    viewport.mount()
    viewport.bindCssVars()
  })
}
catch {
  app.provide('telegram', null)
}

app.use(createNotivue({
  position: 'top-center',
}))

app.mount('#app')

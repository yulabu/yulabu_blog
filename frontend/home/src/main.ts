import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { useUiStore } from '@/stores/ui'
import '@/main.css'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia).use(router)

const uiStore = useUiStore()
uiStore.initTheme()

app.mount('#app')

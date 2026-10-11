import { contextBridge, ipcRenderer } from 'electron'
import { createFateboundApi } from './fatebound-api.ts'

const api = createFateboundApi((channel, ...args) => ipcRenderer.invoke(channel, ...args))

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}

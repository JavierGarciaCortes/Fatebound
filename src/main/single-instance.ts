import type { App } from 'electron'

type SingleInstanceApplication = Pick<App, 'quit' | 'requestSingleInstanceLock'>

export function acquireSingleInstanceLock(application: SingleInstanceApplication): boolean {
  if (application.requestSingleInstanceLock()) return true

  application.quit()
  return false
}

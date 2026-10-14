import {
  WORLD_PACKAGE_ADD_CHANNEL,
  type WorldPackageAddResult
} from '../../shared/world-package-add.ts'
import { WorldPackageAddError } from './world-package-add.ts'

export type WorldPackageSourceSelector = () => Promise<string | undefined>
export type WorldPackageAdder = (selectedPath: string) => Promise<WorldPackageAddResult>
export type WorldPackageAddHandler = () => Promise<WorldPackageAddResult>
export type WorldPackageAddIpcRegistrar = (
  channel: string,
  handler: WorldPackageAddHandler
) => void

export function createWorldPackageAddHandler(
  selectSource: WorldPackageSourceSelector,
  addPackage: WorldPackageAdder,
  onError: (error: unknown) => void = () => undefined
): WorldPackageAddHandler {
  let addInProgress = false

  return async () => {
    if (addInProgress) {
      return Object.freeze({ status: 'error', code: 'add-in-progress' })
    }

    addInProgress = true
    try {
      const selectedPath = await selectSource()
      if (selectedPath === undefined) return Object.freeze({ status: 'cancelled' })
      return await addPackage(selectedPath)
    } catch (error) {
      onError(error)
      return Object.freeze({
        status: 'error',
        code: error instanceof WorldPackageAddError ? error.code : 'copy-failed'
      })
    } finally {
      addInProgress = false
    }
  }
}

export function registerWorldPackageAddIpc(
  registerHandler: WorldPackageAddIpcRegistrar,
  selectSource: WorldPackageSourceSelector,
  addPackage: WorldPackageAdder,
  onError: (error: unknown) => void = () => undefined
): void {
  registerHandler(
    WORLD_PACKAGE_ADD_CHANNEL,
    createWorldPackageAddHandler(selectSource, addPackage, onError)
  )
}

import { createStoragePaths, type StoragePaths, type WriteProbeResult } from './portable-storage.ts'

export type StorageFailureAction = 'retry' | 'choose-directory' | 'exit'

export interface StorageStartupDependencies {
  probeWriteAccess(directory: string): Promise<WriteProbeResult>
  requestFailureAction(directory: string): Promise<StorageFailureAction>
  chooseAlternativeDirectory(): Promise<string | null>
}

export type StorageStartupResult =
  | {
      readonly status: 'ready'
      readonly paths: StoragePaths
      readonly source: 'default' | 'session-override'
    }
  | { readonly status: 'exit' }

export async function prepareStorageForStartup(
  defaultPaths: StoragePaths,
  dependencies: StorageStartupDependencies
): Promise<StorageStartupResult> {
  let candidatePaths = defaultPaths
  let source: 'default' | 'session-override' = 'default'

  checkLocation: while (true) {
    const probe = await dependencies.probeWriteAccess(candidatePaths.dataDirectory)

    if (probe.writable) {
      return { status: 'ready', paths: candidatePaths, source }
    }

    while (true) {
      const action = await dependencies.requestFailureAction(candidatePaths.dataDirectory)

      if (action === 'exit') {
        return { status: 'exit' }
      }

      if (action === 'retry') {
        continue checkLocation
      }

      const selectedDirectory = await dependencies.chooseAlternativeDirectory()

      if (selectedDirectory === null) {
        continue
      }

      candidatePaths = createStoragePaths(selectedDirectory)
      source = 'session-override'
      continue checkLocation
    }
  }
}

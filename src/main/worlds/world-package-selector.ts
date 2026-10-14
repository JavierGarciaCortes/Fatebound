import type { OpenDialogOptions } from 'electron'

export interface WorldPackageSelectorLabels {
  readonly title: string
  readonly button: string
  readonly fileType: string
}

export function createWorldPackageOpenDialogOptions(
  labels: WorldPackageSelectorLabels
): OpenDialogOptions {
  return {
    title: labels.title,
    buttonLabel: labels.button,
    filters: [{ name: labels.fileType, extensions: ['fateworld'] }],
    properties: ['openFile', 'dontAddToRecent']
  }
}

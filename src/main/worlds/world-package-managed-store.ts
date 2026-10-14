export const MANAGED_WORLD_STORE_DIRECTORY_NAME = '.fatebound-managed-v1'
export const MANAGED_WORLD_OWNER_FILE_NAME = 'owner'
export const MANAGED_WORLD_READY_FILE_NAME = 'ready'

const MANAGED_WORLD_SLOT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function isManagedWorldSlotId(value: string): boolean {
  return MANAGED_WORLD_SLOT_PATTERN.test(value)
}

export function managedWorldPackageFileName(slotId: string): string {
  return `managed-${slotId}.fateworld`
}

export function managedWorldOwnerContents(slotId: string, ownerId: string): string {
  return `fatebound-managed-world-v1\nslot=${slotId}\nowner=${ownerId}\n`
}

export function isManagedWorldOwnerContents(contents: string, slotId: string): boolean {
  const lines = contents.split('\n')
  return (
    lines.length === 4 &&
    lines[0] === 'fatebound-managed-world-v1' &&
    lines[1] === `slot=${slotId}` &&
    lines[2]?.startsWith('owner=') === true &&
    isManagedWorldSlotId(lines[2].slice('owner='.length)) &&
    lines[3] === ''
  )
}

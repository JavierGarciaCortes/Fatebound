import type { TranslationMessages } from './es.ts'

export const en = {
  'a11y.skipToContent': 'Skip to content',
  'a11y.primaryNavigation': 'Primary navigation',
  'a11y.goHome': 'Fatebound: go to Home',
  'a11y.activeVisualTheme': 'Active visual theme',
  'a11y.futureWorlds': 'Available worlds and packages',
  'navigation.home.label': 'Home',
  'navigation.home.description': 'Your gateway to adventure',
  'navigation.worlds.label': 'Worlds',
  'navigation.worlds.description': 'Atmospheres and libraries',
  'navigation.characters.label': 'Characters',
  'navigation.characters.description': 'Heroes of your stories',
  'navigation.chronicles.label': 'Chronicles',
  'navigation.chronicles.description': 'Stories in progress',
  'navigation.settings.label': 'Settings',
  'navigation.settings.description': 'Application and storage',
  'navigation.settings.open': 'Open Settings',
  'navigation.settings.opened': 'Settings open',
  'common.upcoming': 'Coming soon',
  'common.packageAvailable': 'Package available',
  'common.installed': 'Installed',
  'common.baseIdentity': 'Base identity',
  'common.noActiveWorld': 'No active world',
  'sidebar.activeAtmosphere': 'Active atmosphere',
  'sidebar.localPortableOffline': 'Local · Portable · Offline',
  'home.neutralBadge': 'Fatebound · No active world',
  'home.futureBadge': 'Future world · Coming soon',
  'home.explore': 'Explore atmospheres',
  'home.returnToFatebound': 'Return to Fatebound',
  'home.journal.eyebrow': 'Your adventure journal',
  'home.journal.title': 'The next chronicle begins here',
  'home.journal.body':
    'When chronicles arrive, this space will gather decisions, scenes, and consequences. There are no playable stories or saved sample data yet.',
  'home.journal.future': 'Planned for a later phase',
  'home.library.eyebrow': 'Local library',
  'home.library.title': 'No worlds installed',
  'home.library.body':
    'No world is installed. The Worlds screen shows the eight settings and any valid packages available beside the application.',
  'home.library.action': 'View worlds and packages',
  'worlds.eyebrow': 'Visual library',
  'worlds.title': 'Choose the tone of your adventure',
  'worlds.intro':
    'Explore the eight settings and review packages detected beside Fatebound. An available package is not installed or playable yet.',
  'worlds.add.action': 'Add world',
  'worlds.add.processing': 'Selecting, validating, and copying…',
  'worlds.add.success':
    'Package {worldId} v{worldVersion} was added to worlds/. It is not installed yet.',
  'worlds.add.cancelled': 'Selection cancelled. Nothing was copied or installed.',
  'worlds.add.alreadyAvailable':
    'Package {worldId} v{worldVersion} is already available in worlds/. It was not duplicated.',
  'worlds.add.invalid':
    'The file is not a valid .fateworld v1 package, is too large, or is not a regular file.',
  'worlds.add.incompatible':
    'The package format or capabilities are incompatible with this version of Fatebound.',
  'worlds.add.changed':
    'The file changed during the operation. No partial copy was published.',
  'worlds.add.versionConflict':
    'A different package already declares the same world and version. Change the package version before adding it.',
  'worlds.add.destinationUnavailable':
    'The worlds/ folder could not be checked or prepared safely.',
  'worlds.add.copyFailed':
    'The package could not be copied. Check permissions and free space; other packages were not changed.',
  'worlds.add.inProgress': 'A world package is already being added.',
  'worlds.install.action': 'Install',
  'worlds.install.processing': 'Installing and verifying…',
  'worlds.install.previewEyebrow': 'Installation confirmation',
  'worlds.install.previewTitle': 'Review this version before installing',
  'worlds.install.previewBody':
    'Fatebound will validate the package again and keep a managed copy in portable storage.',
  'worlds.install.previewWorld': 'World',
  'worlds.install.previewVersion': 'Version',
  'worlds.install.previewLanguages': 'Included languages',
  'worlds.install.previewWarning':
    'Installing does not activate the world, enable Characters or Chronicles, or execute rules.',
  'worlds.install.cancelAction': 'Cancel',
  'worlds.install.confirmAction': 'Confirm installation',
  'worlds.install.success':
    '{worldId} v{worldVersion} was installed and verified. It is not playable yet.',
  'worlds.install.alreadyInstalled':
    '{worldId} v{worldVersion} was already installed with the same content.',
  'worlds.install.unavailable':
    'The selected version is no longer available in the validated catalogue.',
  'worlds.install.changed': 'The package changed during installation and was not registered.',
  'worlds.install.versionConflict':
    'The same identity and version already exist with different content.',
  'worlds.install.storageUnavailable': 'World storage is not safely available.',
  'worlds.install.copyFailed':
    'The managed copy could not be prepared. Check permissions and available space.',
  'worlds.install.databaseUnavailable':
    'The installation could not be registered in SQLite. The package will not appear as installed.',
  'worlds.install.incomplete':
    'The copy and registration for this version are inconsistent. It requires review and will not be used.',
  'worlds.install.inProgress': 'A world installation is already in progress.',
  'worlds.catalog.refresh': 'Refresh catalogue',
  'worlds.catalog.refreshing': 'Refreshing…',
  'worlds.catalog.summary':
    '{packages} versions available · {installed} installed · {issues} issues',
  'worlds.catalog.error':
    'The package folder could not be read. Installed worlds and data have not been changed.',
  'worlds.catalog.additionalEyebrow': 'Detected packages',
  'worlds.catalog.additionalTitle': 'Other available worlds',
  'worlds.catalog.additionalIntro':
    'These entries use a neutral presentation and remain uninstalled.',
  'worlds.catalog.issuesEyebrow': 'Review required',
  'worlds.catalog.issuesTitle': 'Unavailable packages',
  'worlds.catalog.issue.invalid': 'The package is invalid and has been omitted.',
  'worlds.catalog.issue.incompatible':
    'Its format or capabilities are incompatible with this version of Fatebound.',
  'worlds.catalog.issue.temporary':
    'The file is incomplete, changed, or cannot be read now. Refresh again after copying finishes.',
  'worlds.catalog.issue.duplicate':
    'Several files declare the same world and version; that release has been omitted.',
  'worlds.catalog.issue.installation':
    'An installation is incomplete or does not match its record and will not be used.',
  'worlds.catalog.scanLimited':
    'The scan reached its safety limit. Remove unnecessary files and refresh again.',
  'worlds.atmosphere': 'Atmosphere',
  'worlds.availability': 'Availability',
  'worlds.note':
    'This world does not contain rules or playable content yet. For now, selecting it only changes the visual atmosphere for this session.',
  'worlds.packageAvailableNote':
    'Detected versions: {versions}. The package is not installed, and format v1 does not yet provide the mechanical capabilities required to play.',
  'worlds.installedNote':
    'Recognised versions: {versions}. The installed copy is verified, but the world remains unplayable until its engine exists.',
  'worlds.empty.eyebrow': 'No world selected',
  'worlds.empty.title': 'Explore a future atmosphere',
  'worlds.empty.body':
    'Fatebound remains the base identity. Select a card to see a world’s tone and emblem without activating playable content.',
  'characters.eyebrow': 'Protagonist archive',
  'characters.title': 'Your characters have not arrived yet',
  'characters.body':
    'Character creation and management will arrive with the game schema. This screen saves no data and offers no simulated actions.',
  'characters.future.title': 'Ready for the future',
  'characters.future.body': 'Each character will be linked to an exact version of their world.',
  'chronicles.eyebrow': 'Chronicles',
  'chronicles.title': 'No stories in progress',
  'chronicles.body':
    'Chronicles and their scenes are not implemented yet. When they are, this is where you will resume them without losing their world or version.',
  'chronicles.future.title': 'No fictional content',
  'chronicles.future.body': 'Fatebound will not create sample chronicles in your database.',
  'settings.eyebrow': 'Local system',
  'settings.title': 'Settings and diagnostics',
  'settings.intro':
    'Preferences and diagnostics are handled safely in the main process, without exposing SQLite or the file system.',
  'settings.language.eyebrow': 'Interface',
  'settings.language.title': 'Application language',
  'settings.language.body':
    'Changes Fatebound controls and messages. It does not change or invent world content languages.',
  'settings.language.groupLabel': 'Select the application language',
  'settings.language.es': 'Español',
  'settings.language.en': 'English',
  'settings.language.ko': '한국어',
  'settings.language.saving': 'Saving the portable preference…',
  'settings.language.saved': 'Language saved in portable storage.',
  'settings.language.invalid':
    'The saved preference was invalid. Spanish has been used as a safe fallback.',
  'settings.language.loadError':
    'The portable preference could not be read. Spanish is being used for this session.',
  'settings.language.saveError':
    'The language changed for this session, but it could not be saved. Fatebound will use the last valid preference when reopened.',
  'settings.export.eyebrow': 'External copy',
  'settings.export.title': 'Export backup',
  'settings.export.body':
    'Choose a folder outside active storage. Fatebound will create a self-contained, verified SQLite backup with a unique name inside it.',
  'settings.export.action': 'Choose folder and export',
  'settings.export.working': 'Creating and verifying the backup…',
  'settings.export.success': 'Backup exported successfully as {backupName}.',
  'settings.export.cancelled': 'Export cancelled. No backup was created.',
  'settings.export.destinationError':
    'That folder interferes with active data or backups. Choose a different location.',
  'settings.export.destinationUnavailableError':
    'That folder could not be validated or used. Check that it is still available and choose another location.',
  'settings.export.inProgressError': 'A backup export is already in progress.',
  'settings.export.genericError':
    'The export could not be completed. The active database and earlier backups were not modified.',
  'settings.restore.eyebrow': 'Controlled recovery',
  'settings.restore.title': 'Restore backup',
  'settings.restore.body':
    'Select a Fatebound backup folder. The backup will be verified before restoration is offered.',
  'settings.restore.action': 'Select backup',
  'settings.restore.selecting': 'Selecting and verifying the backup…',
  'settings.restore.selectionCancelled': 'Selection cancelled. No data was modified.',
  'settings.restore.invalidError':
    'The folder does not contain a complete, readable, and verifiable Fatebound backup.',
  'settings.restore.incompatibleError':
    'The backup uses a schema version that this version of Fatebound cannot restore.',
  'settings.restore.changedError':
    'The backup changed after the preview. Select it again and verify it once more.',
  'settings.restore.selectionRequiredError': 'Select and verify a backup before confirming.',
  'settings.restore.inProgressError': 'A restore operation is already in progress.',
  'settings.restore.recoveryRequiredError':
    'Fatebound could not reopen a safe database. Close and reopen the application to run startup recovery; do not move or delete the data files.',
  'settings.restore.genericError':
    'The restore could not be completed. Fatebound attempted to preserve or recover the previous database.',
  'settings.restore.working': 'Protecting the active database and restoring the backup…',
  'settings.restore.success': 'Backup restored and the SQLite database verified successfully.',
  'settings.restore.cancelAction': 'Cancel',
  'settings.restore.confirmAction': 'Confirm restore',
  'settings.restore.previewDate': 'Backup date',
  'settings.restore.previewType': 'Type',
  'settings.restore.previewSchema': 'Schema version',
  'settings.restore.previewSize': 'Size',
  'settings.restore.warning':
    'Confirming will replace the active SQLite data. Fatebound will first create and verify a protected backup of the current database.',
  'settings.restore.reason.preMigration': 'Pre-migration',
  'settings.restore.reason.protected': 'Protected',
  'settings.restore.reason.automatic': 'Automatic',
  'settings.restore.reason.manual': 'Manual',
  'settings.diagnostics.readOnly': 'Read only',
  'settings.diagnostics.title': 'SQLite storage',
  'settings.diagnostics.checking': 'Checking…',
  'settings.diagnostics.refresh': 'Refresh',
  'settings.diagnostics.loadingTitle': 'Checking storage',
  'settings.diagnostics.loadingBody': 'The check runs once and does not modify the database.',
  'settings.diagnostics.errorTitle': 'Diagnostics unavailable',
  'settings.diagnostics.errorBody':
    'Diagnostics could not be completed. SQLite may be closing or the drive may be unavailable.',
  'settings.diagnostics.readyTitle': 'SQLite available and verified',
  'settings.diagnostics.readyBody': 'Integrity and foreign keys are valid · {date}',
  'settings.diagnostics.dataLocation': 'Data location',
  'settings.diagnostics.database': 'Database',
  'settings.diagnostics.sqliteStatus': 'SQLite status',
  'settings.diagnostics.available': 'Available',
  'settings.diagnostics.schemaVersion': 'Schema version',
  'settings.diagnostics.integrity': 'Integrity',
  'settings.diagnostics.correct': 'Valid',
  'settings.diagnostics.backups': 'Valid managed backups',
  'settings.securityNote':
    'The renderer receives a limited snapshot. It never receives the SQLite connection, SQL queries, or general file-system access.',
  'theme.fatebound.name': 'Fatebound',
  'theme.fatebound.tagline': 'An archive of destinies and adventures',
  'theme.fatebound.category': 'Neutral identity',
  'theme.fatebound.description':
    'A gateway between worlds where destinies, chronicles, and adventures can be gathered without imposing a setting.',
  'theme.fatebound.atmosphere': 'Celestial archive · Dark stone · Gold',
  'theme.ronin.name': 'Ronin',
  'theme.ronin.tagline': 'Honor, steel, and destiny',
  'theme.ronin.category': 'Feudal Japan',
  'theme.ronin.description':
    'Silence, steel, and choices that leave their mark across a land of mountains, rain, and red maples.',
  'theme.ronin.atmosphere': 'Ink · Crimson · Bronze',
  'theme.templario.name': 'Templario',
  'theme.templario.tagline': 'Oaths, roads, and strongholds',
  'theme.templario.category': 'Templar knight',
  'theme.templario.description':
    'Ancient stone, high roads, and difficult vows for adventures of duty and endurance.',
  'theme.templario.atmosphere': 'Stone · Crimson · Steel',
  'theme.ninja.name': 'Ninja',
  'theme.ninja.tagline': 'Silence, shadow, and precision',
  'theme.ninja.category': 'Stealth',
  'theme.ninja.description':
    'Rain-soaked rooftops, moonlight, and measured choices for stories that move without a sound.',
  'theme.ninja.atmosphere': 'Shadow · Jade · Moonlight',
  'theme.shaolin.name': 'Shaolin',
  'theme.shaolin.tagline': 'Discipline, the path, and compassion',
  'theme.shaolin.category': 'Martial arts',
  'theme.shaolin.description':
    'Mountains, temples, and inner discipline for tales of learning, balance, and compassion.',
  'theme.shaolin.atmosphere': 'Earth · Saffron · Dawn',
  'theme.robot.name': 'Robot',
  'theme.robot.tagline': 'Memory, steel, and identity',
  'theme.robot.category': 'Science fiction',
  'theme.robot.description':
    'Metal, memory, and signals in the dark for stories about identity and technology.',
  'theme.robot.atmosphere': 'Graphite · Metal · Cyan',
  'theme.soldado.name': 'Soldado',
  'theme.soldado.tagline': 'Survival, territory, and mission',
  'theme.soldado.category': 'Special operations',
  'theme.soldado.description':
    'Hostile terrain, observation, and limited resources for tales of missions and survival.',
  'theme.soldado.atmosphere': 'Olive · Sand · Steel',
  'theme.naves.name': 'Naves',
  'theme.naves.tagline': 'Exploration, the void, and stars',
  'theme.naves.category': 'Space odyssey',
  'theme.naves.description':
    'Remote orbits, vessels, and impossible horizons for adventures beyond the known map.',
  'theme.naves.atmosphere': 'Void · Violet · Starlight',
  'theme.mundoplato.name': 'Mundoplato',
  'theme.mundoplato.tagline': 'Adventures, magic, and mishaps',
  'theme.mundoplato.category': 'Uncanny fantasy',
  'theme.mundoplato.description':
    'Impossible cities, whimsical maps, and unpredictable magic for adventures of wit, wonder, and humor.',
  'theme.mundoplato.atmosphere': 'Parchment · Copper · Twilight',
  'native.storage.writeError': 'Fatebound cannot write to the data folder.',
  'native.storage.writeErrorDetail':
    '{directory}\n\nYou can check it again, choose another folder for this session, or exit. Fatebound will not change location or move data automatically.',
  'native.storage.retry': 'Retry',
  'native.storage.chooseDirectory': 'Choose another folder',
  'native.storage.exit': 'Exit',
  'native.storage.chooseTitle': 'Choose Fatebound data folder',
  'native.storage.chooseButton': 'Use this folder',
  'native.backup.title': 'Backup not completed',
  'native.backup.message': 'Fatebound could not create or maintain the automatic SQLite backup.',
  'native.backup.detail':
    'The main database and previous backups were not replaced. You can keep using Fatebound, but check the available space and the drive before continuing.',
  'native.export.chooseTitle': 'Choose destination for the Fatebound backup',
  'native.export.chooseButton': 'Export here',
  'native.restore.chooseTitle': 'Choose a Fatebound backup',
  'native.restore.chooseButton': 'Verify this backup',
  'native.worlds.add.chooseTitle': 'Choose a Fatebound world package',
  'native.worlds.add.chooseButton': 'Add this package',
  'native.worlds.add.fileType': 'Fatebound world package',
  'native.common.accept': 'Understood',
  'native.database.title': 'Fatebound cannot open your data',
  'native.database.detail':
    'The SQLite integrity check, backup, migration, or recovery could not be completed. Fatebound will close without opening the interface and will not initialize an empty database over recoverable files.'
} satisfies TranslationMessages

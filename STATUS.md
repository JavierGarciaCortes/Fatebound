# Estado de desarrollo

Última actualización: 2026-10-14

Base histórica de esta línea de trabajo: `feature/app-shell` ya estaba integrada en `main` en el commit `67350b7`. En ese punto se habían superado 67 pruebas, lint, typecheck y los builds, y la interfaz multilingüe se había verificado manualmente.

Hito de restauración SQLite: desarrollado originalmente en `feature/sqlite-safe-restore`.

Hito base ya validado: exportación manual segura de backups SQLite, desarrollada originalmente en `feature/sqlite-manual-export`.

La exportación quedó validada con 74/74 tests, lint, typecheck, builds y portable de Windows correctos, además de una exportación real con manifiesto, tamaño, SHA-256, integridad y claves foráneas comprobados. La restauración cuenta ya con validación automatizada y comprobación manual de su flujo normal y sus rechazos; las interrupciones reales y los escenarios excepcionales indicados más abajo continúan pendientes.

## Estado general

Fatebound 2.0 dispone ya de una primera interfaz visual funcional sobre Electron 44.7.0 y Vue. La shell carga nueve temas visuales y está traducida al español, inglés y coreano, con cambio inmediato y preferencia portable. Sin un mundo activo comienza en Fatebound neutral, el menú muestra solo Mundos y Ajustes reúne idioma, diagnóstico SQLite, exportación y restauración manual de backups.

El producto continúa en fase de fundamentos: el contrato y el validador `.fateworld` v1 están implementados y cuentan con la validación histórica indicada más abajo. El equipo comunicó 112 pruebas correctas con una omitida y una comprobación manual satisfactoria del selector, la copia, el SHA-256 y los duplicados para la implementación anterior en NTFS. La nueva publicación gestionada compatible con FAT32/exFAT está implementada en código, pero no se ha ejecutado en esta tarea. Todavía no existen esquema del juego, mundos instalados, personajes, campañas, reglas ni instalación persistente. Ronin, Templario, Ninja, Shaolin, Robot, Soldado, Naves y Mundoplato conservan sus tarjetas; muestran **Próximamente** o **Paquete disponible** según la consulta, sin representar contenido jugable o instalado.

## Implementado

### Interfaz y temas

- [x] Inicio integrado en todo el bloque de marca y Ajustes trasladado a un engranaje global de cabecera, ambos con estado activo, hover, foco y semántica de botón.
- [x] Navegación contextual con solo Mundos sin mundo jugable; estructura preparada para añadir Personajes y Crónicas únicamente con un mundo instalado activo y versionado.
- [x] Navegación adaptativa durante la sesión, con barra lateral amplia y variante inferior compacta.
- [x] Pantalla de inicio con nuevo logo horizontal de Fatebound en la barra amplia, símbolo en contextos compactos y una ilustración `hero` protagonista bajo superposiciones legibles.
- [x] Fatebound neutral como identidad base inicial, fuera de las tarjetas de mundos, y acción explícita para regresar a él desde cualquier ambientación.
- [x] Catálogo YAML cerrado en `resources/builtin-themes/` para Fatebound, Ronin, Templario, Ninja, Shaolin, Robot, Soldado, Naves y Mundoplato.
- [x] Carga de YAML y recursos mediante imports de Vite limitados, sin acceso del renderer al sistema de archivos.
- [x] Validación tipada de esquema, identificador, estado no jugable, paletas, opciones y rutas relativas seguras.
- [x] Nueve `hero`, nueve `card` y nueve `emblem` integrados; fallbacks por recurso ausente o fallido sin bloquear la interfaz.
- [x] Tarjetas ilustradas verticales 3:4 en Mundos y panel de detalle protagonizado por el emblema, sin hero de fondo.
- [x] Ocho tarjetas ilustradas conservadas, con **Próximamente** o **Paquete disponible** según el ID estable detectado, seleccionables para ambientación pero sin acciones de juego, instalación o apertura; **Añadir mundo** permanece en el encabezado y no en las tarjetas.
- [x] Vistas estructurales honestas de Personajes y Crónicas, fuera de la navegación actual y sin botones inertes ni datos ficticios persistidos.
- [x] Foco visible, enlace para saltar al contenido, controles de teclado, estados hover y `prefers-reduced-motion`.
- [x] Seis recursos de marca organizados en `resources/branding/fatebound/`; el logo sigue siendo un botón accesible de Inicio y el PNG de aplicación alimenta el icono del portable de Windows.

### Internacionalización

- [x] Catálogo central de traducciones con archivos independientes para `es`, `en` y `ko`, claves tipadas, coherencia comprobable y fallback explícito a español.
- [x] Todos los textos visibles de la shell, mundos, estados vacíos, Ajustes, diagnóstico, tooltips y etiquetas accesibles salen del catálogo.
- [x] Textos de presentación de los nueve temas separados de `theme.yaml` y enlazados por identificador estable, sin duplicar paletas ni recursos.
- [x] Selector accesible en Ajustes con Español, English y 한국어, cambio inmediato sin perder sección ni tema y estado de guardado anunciado.
- [x] Fechas del diagnóstico formateadas con `Intl` según `es-ES`, `en-GB` o `ko-KR`, y fallbacks tipográficos locales para hangul.
- [x] Preferencia validada y guardada atómicamente en `data/preferences.json`; ausencia, corrupción o valor no admitido vuelven a español.
- [x] Idioma de aplicación separado del futuro idioma de contenido de cada mundo; las previsualizaciones actuales no declaran contenido jugable multilingüe.

### Diagnóstico y frontera de procesos

- [x] Canal fijo `fatebound:storage:get-diagnostics`, sin argumentos y con respuesta compartida tipada.
- [x] Preload reducido a diagnóstico, exportación, selección/confirmación/cancelación de restauración y preferencia de idioma mediante operaciones específicas; retirados `electronAPI`, `ipcRenderer` expuesto y el canal `ping`.
- [x] Ventana con `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true`.
- [x] Comprobación puntual de `quick_check`, claves foráneas y versión de esquema, serializada con la cola SQLite.
- [x] Recuento de copias administradas que vuelven a superar manifiesto, estructura, tamaño, SHA-256 e integridad.
- [x] Rutas activas mostradas sin capacidad de recorrer archivos ni proporcionar rutas arbitrarias al proceso main.
- [x] Fallos convertidos en un estado visible y sanitizado; el detalle técnico permanece en main.

### Infraestructura conservada

- [x] Rutas portables, comprobación de escritura y flujo de recuperación previos a la ventana.
- [x] SQLite mediante `node:sqlite`, exclusivamente en main y con `journal_mode=DELETE` y `synchronous=EXTRA`.
- [x] Integridad, migraciones transaccionales, copia obligatoria previa a migraciones y bloqueo de instancia única.
- [x] Copias automáticas después de cambios confirmados, estado persistente y retención segura 6/2.
- [x] Cierre coordinado de escrituras, copias y conexión.

### Formato `.fateworld` v1

- [x] Especificación normativa cerrada con versión de formato separada de la identidad y versión semántica del mundo.
- [x] Manifiesto con idiomas reales, predeterminado, títulos localizados, Markdown, YAML de tablas, imágenes opcionales y lista de capacidades mecánicas obligatoriamente vacía en v1.
- [x] Servicio tipado en main, reutilizado por el catálogo de disponibilidad, que no extrae archivos, no modifica SQLite y permanece separado del futuro instalador.
- [x] Inspección ZIP real con CRC-32, límites de archivo/entrada/expansión/ratio/profundidad, métodos Stored o Deflate y rechazo de cifrado, enlaces, tipos especiales y reparse points.
- [x] Rutas relativas NFC, sin escapes, duplicados, nombres reservados ni colisiones relevantes en Windows.
- [x] Subconjunto YAML 1.2 `failsafe`, sin alias, anclas, etiquetas, merge, documentos múltiples, claves duplicadas ni campos desconocidos.
- [x] Tablas y entradas con identificadores estables, traducciones completas, referencias únicas y resolución de destinos.
- [x] Resultados estructurados con errores sanitizados que no exponen la ruta absoluta de origen.
- [x] Fuentes originales y paquete reproducible **Ecos de la marea** bajo `examples/fateworld/`, sin capacidades mecánicas ni condición jugable.
- [x] Pruebas focalizadas para aceptación, incompatibilidades, rutas/límites, tipos peligrosos, IDs/referencias y YAML peligroso; las 19 pruebas específicas del validador quedaron correctas tras reforzar la comprobación de caracteres de control.

### Catálogo de paquetes disponibles

- [x] Resolución de `worlds/` junto al ejecutable portable mediante `PORTABLE_EXECUTABLE_DIR` o `process.execPath`, y `.fatebound-dev/worlds/` aislado durante desarrollo, sin depender de `process.cwd()`.
- [x] Carpeta ausente tratada como catálogo vacío; consulta estrictamente de solo lectura que combina `.fateworld` directos y publicaciones bajo `.fatebound-managed-v1/<uuid>/`, con límites conjuntos de 256 entradas y 32 candidatos.
- [x] Los slots gestionados sin `ready` no son candidatos; los publicados exigen UUID v4, `owner`, un único `managed-<uuid>.fateworld`, `ready` vacío y ninguna entrada adicional.
- [x] Rechazo de bandeja, almacén, slot o candidatos enlazados, fuentes no regulares o fuera de su directorio, estructuras inesperadas y paquetes que cambian durante la validación; los fallos individuales no bloquean el resto.
- [x] Reutilización del validador v1 y separación explícita entre paquetes válidos, incompatibles, inválidos/reintentables y duplicados exactos de `world.id + world.version`.
- [x] Versiones distintas del mismo mundo conservadas por separado; la identidad siempre procede del manifiesto, nunca del nombre del archivo.
- [x] Canal sin argumentos `fatebound:worlds:get-package-catalog`, preload tipado y respuesta sin rutas absolutas, trazas ni mensajes internos sin localizar.
- [x] Asociación exacta de las ocho tarjetas mediante `com.fatebound.worlds.<id-del-tema>`; otros IDs válidos aparecen con presentación neutral sin perder ni sustituir ilustraciones integradas.
- [x] Actualización manual localizada desde Mundos y estados separados **Próximamente**, **Paquete disponible** e **Instalado**; esta etapa nunca produce el último.
- [x] Pruebas focalizadas añadidas para carpeta ausente, filtrado directo, versiones, incompatibilidad, duplicados, cambio durante lectura, enlaces cuando el sistema permite crearlos, error IPC sanitizado y preload sin argumentos. No se han ejecutado en esta tarea.

### Incorporación de paquetes a `worlds/`

- [x] Botón **Añadir mundo** junto a **Actualizar catálogo**, con selector nativo de main filtrado a un único `.fateworld`, estado de procesamiento y resultados localizados en español, inglés y coreano.
- [x] Canal sin argumentos `fatebound:worlds:add-package`; el renderer no aporta ni recibe rutas, y main conserva selección, validación y copia.
- [x] Rechazo de fuentes enlazadas, no regulares, inválidas, incompatibles, sobredimensionadas o cambiadas durante la operación mediante el validador v1 existente y comprobaciones antes y después de copiar.
- [x] Publicación en un slot UUID exclusivo de `.fatebound-managed-v1/`: `owner` identifica la estructura, la copia usa creación sin sobrescritura, se sincroniza cuando la plataforma lo permite y se revalida por identidad y SHA-256 antes de publicar.
- [x] Creación exclusiva del marcador vacío `ready` como último paso lógico; no se usan enlaces físicos, copia directa a una ruta visible ni `rename()` como garantía de ausencia de sobrescritura.
- [x] Original seleccionado conservado; cancelación sin crear ni copiar; los fallos anteriores a `ready` no publican el paquete y solo permiten limpiar el slot de esta operación si `owner`, contención y estructura siguen siendo verificables.
- [x] Si `ready` llega a existir, el importador no borra el slot ante un error posterior: consulta y revalida el catálogo para resolver el resultado. Restos anteriores y estructuras desconocidas nunca se eliminan automáticamente.
- [x] Paquetes idénticos del mismo `world.id` + `world.version` tratados como ya disponibles, bytes distintos con esa identidad tratados como conflicto y versiones distintas permitidas.
- [x] Selección de un archivo ya disponible, manual o gestionado, tratada sin duplicación; las incorporaciones desde la interfaz se serializan.
- [x] Actualización automática del catálogo tras éxito o coincidencia existente, sin navegación ni cambio de tema y sin acción **Instalar ahora**.
- [x] Pruebas focalizadas ajustadas para invisibilidad antes de `ready`, validación previa a publicación, paquete gestionado dañado, estructura/enlaces inseguros, conflictos manual-gestionado, fallos antes y después de `ready` y colisión de slot. No se han ejecutado en esta tarea.

### Exportación manual SQLite

- [x] Acción accesible en Ajustes con estados localizados de trabajo, éxito, cancelación y error en español, inglés y coreano.
- [x] Selector nativo de carpeta gestionado por main; el canal `fatebound:storage:export-sqlite-backup` no acepta rutas ni argumentos desde el renderer.
- [x] Copia online consistente mediante el servicio existente, serializada con escrituras, backups automáticos y cierre.
- [x] Directorio autocontenido y único con `fatebound.sqlite` y `manifest.json`, sin sobrescritura y con validación final de estructura, tamaño, SHA-256, integridad y claves foráneas.
- [x] Rechazo de destinos dentro de los datos o backups activos después de resolver su ruta real.
- [x] Limpieza limitada a temporales con marcador propio y a la candidata recién publicada que falle la validación final; cancelación sin escritura.
- [x] Copias exportadas fuera de la retención 6/2 y del estado del programador automático.

### Restauración manual SQLite

- [x] Acción separada en Ajustes, con selector nativo de main, vista previa fiable de fecha, tipo, esquema y tamaño, advertencia de sustitución y confirmación explícita.
- [x] Tres contratos IPC sin argumentos para seleccionar, confirmar o cancelar; main conserva la selección validada y el renderer no recibe ni aporta rutas o metadatos de confianza.
- [x] Validación del backup v2 mediante los validadores existentes: estructura exacta, aplicación, nombre, tamaño, SHA-256, integridad, claves foráneas e historia de migraciones compatible.
- [x] Revalidación al confirmar y segunda verificación de la copia preparada en un workspace controlado para detectar cambios posteriores a la vista previa.
- [x] Operación serializada con escrituras, backups automáticos y cierre; copia `protected` de la base activa creada y verificada antes de cerrar SQLite.
- [x] Sustitución con la conexión cerrada, reapertura, migración compatible y comprobación completa antes de declarar éxito; la retención se aplaza hasta terminar.
- [x] Journal persistente de restauración: una interrupción incompleta recupera la base previa, una finalizada conserva la nueva solo si vuelve a validarse y una situación ambigua bloquea el arranque sin crear una base vacía.
- [x] Copia de origen inmutable y limpieza limitada al journal, temporales y workspace propios de la operación.

## Funciones demostrativas o pendientes

- Los ocho mundos siguen siendo un catálogo interno de presentación; las tarjetas no son paquetes `.fateworld`, no aparecen en SQLite y no contienen reglas. Fatebound neutral es la identidad base y no forma parte de esas ocho tarjetas.
- **Próximamente** indica que no se ha detectado un paquete correspondiente; **Paquete disponible** indica solo una publicación v1 válida en la bandeja. **Instalado** se reserva para una futura versión administrada bajo `data/worlds/`.
- La selección temática dura solo durante la sesión y comienza de nuevo en Fatebound neutral al abrir la aplicación.
- Personajes y Crónicas no aparecen en el menú sin un mundo jugable activo; sus vistas estructurales no crean, editan ni persisten datos.
- Ajustes ofrece idioma, diagnóstico, exportación y restauración manual de backups SQLite; no ofrece exploración general de archivos ni cambio de la raíz activa.
- La muestra **Ecos de la marea** está destinada a verificar el contrato como artefacto técnico; no está instalada ni se copia automáticamente a la bandeja. Si el usuario la deposita allí, aparece como entrada neutral disponible.
- No existe todavía vista previa de instalación, instalación persistente, editor de mundos, motor de reglas, campañas jugables o IA. **Añadir mundo** solo incorpora un paquete a la bandeja.

## Siguiente tarea prioritaria

**Implementar la etapa 3: vista previa, confirmación e instalación inmutable bajo `data/worlds/`, reutilizando exactamente la bandeja, el catálogo y el validador existentes sin aceptar rutas desde el renderer ni registrar una versión antes de publicarla.**

## Pendientes por fases

### Seguridad y recuperación

- Resolver de forma controlada las ocho advertencias moderadas restantes relacionadas con `electron-builder`, `app-builder-lib`, `@electron/get` 3.x y la cadena `global-agent` → `roarr` → `sprintf-js`, sin aplicar `npm audit fix --force`, overrides ni parches manuales.
- Diseñar la recuperación conjunta de SQLite y las versiones instaladas de paquetes que necesiten sus datos.
- Diseñar la cuarentena y recuperación asistida de una base activa dañada fuera de una restauración registrada.
- Validar la aplicación desde un pendrive físico y otro ordenador.
- Probar manualmente interrupciones reales durante una restauración y comprobar la recuperación al siguiente arranque; las pruebas automatizadas de rollback y fallback no sustituyen este ensayo.
- Probar fallos de permisos y espacio insuficiente durante la restauración.
- Revisar exhaustivamente los textos y estados del nuevo flujo en inglés y coreano.
- Probar confirmaciones repetidas y otros escenarios excepcionales todavía no cubiertos manualmente.
- Probar manualmente dos ejecutables simultáneos y el cierre durante una copia grande.

### Persistencia y mundos

- Mantener pendiente la recuperación conjunta con paquetes, sin sobrescritura silenciosa.
- Implementar repositorios sobre la transacción central SQLite.
- Implementar vista previa, confirmación e instalación inmutable bajo `data/worlds/` reutilizando la bandeja, el catálogo y el validador v1.
- Definir los vínculos exactos de personajes y crónicas con identidad y versión de mundo.
- Implementar la ficha base permanente y el progreso independiente por Crónica, impidiendo que una ficha participe en dos Crónicas en curso.
- Conservar la ocupación tras cerrar la aplicación; liberar la ficha solo al finalizar o abandonar definitivamente, con abandono irreversible e historial consultable.
- Permitir reutilizar una ficha base en otra Crónica después de la muerte del personaje en una anterior.
- Preparar inicialmente paquetes con herramientas propias antes de construir un editor visual avanzado.

### Mecánicas y juego

- Implementar primero el motor fiel a Ronin: dados Yin/Yang, tablas enlazadas, atributos, interacciones, técnicas, combate, bloqueos, efectos y consecuencias.
- Hacer que los primeros mundos compartan ese motor y cambien principalmente ambientación, contenido y organización de tablas y técnicas.
- Usar identificadores estables para tablas, independientes de la posición visible, y validar referencias cuando un mundo reorganice, sustituya u omita tablas o reglas.
- Añadir después capacidades compatibles para Robot y Soldado.
- Incorporar por último sistemas avanzados sin invalidar contenido ni partidas anteriores.
- Implementar personajes, crónicas, eventos y exportación Markdown.

## Problemas y limitaciones conocidos

- La apariencia y accesibilidad necesitan evaluación visual manual prolongada en los nueve temas, las ocho tarjetas y los tamaños extremos de ventana; las pruebas técnicas no cierran esta revisión.
- Los textos ingleses y coreanos, sus saltos de línea, el hangul y el selector de idioma necesitan revisión manual en el ejecutable y en tamaños compactos.
- Los recursos de `builtin-themes` se identifican como ilustraciones propias integradas en Fatebound. Conviene conservar un registro formal de procedencia y derechos junto al proceso de publicación.
- El portable de Windows convierte `fatebound-app-icon.png` durante el build; `build/icon.ico` y `build/icon.icns` no se han regenerado y deben revisarse en una tarea específica si se reutilizan para otros targets.
- La portabilidad no se ha validado desde un pendrive físico ni desde otro ordenador.
- El protocolo gestionado ya no depende de enlaces físicos y usa directorios, copia exclusiva y creación exclusiva de `ready`, operaciones disponibles en NTFS, FAT32 y exFAT. La atomicidad es lógica para el catálogo, no una garantía de durabilidad frente a extracción física o cortes de alimentación; faltan pruebas manuales en unidades FAT32/exFAT reales y ensayos de interrupción.
- `Fatebound.exe` no tiene firma Authenticode.
- Las copias locales comparten dispositivo con la base; la exportación externa depende de que el usuario elija y conserve otra unidad. La restauración actual recupera solo SQLite y no las versiones de paquetes `.fateworld`.
- El flujo normal y los rechazos de restauración se han validado manualmente en una instalación portable aislada; no se han probado interrupciones reales durante la sustitución ni la recuperación posterior en una unidad extraíble física.
- La sustitución de archivos requiere varios pasos y no es atómica; la seguridad depende del journal persistente, `previous.sqlite` y la copia `protected`, y no elimina el riesgo físico de retirar o perder la unidad durante la operación.
- La recuperación ante fallos está cubierta parcialmente por pruebas automatizadas, pero no se considera infalible ni equivale a haber provocado y verificado manualmente una interrupción real.
- Retirar una unidad durante una escritura sigue siendo inseguro incluso con la configuración conservadora de SQLite.
- `node:sqlite` permanece ligado al runtime de Node incluido en Electron 44.7.0. Las pruebas automatizadas se ejecutaron con Node 22.23.2 del equipo, por lo que la comprobación del runtime integrado depende de los ensayos realizados con el portable real.
- La especificación normativa y el validador `.fateworld` v1 han superado sus comprobaciones técnicas históricas. El equipo comunicó 112 pruebas correctas con una omitida y validación manual satisfactoria del flujo anterior en NTFS; el almacén gestionado, su catálogo combinado y FAT32/exFAT todavía no se han ejecutado ni revisado visualmente. Tampoco existen instalación bajo `data/worlds/`, esquema del juego ni motor mecánico.
- Antes de la migración, la auditoría completa informaba 10 vulnerabilidades npm —8 moderadas y 2 altas— y la auditoría con `--omit=dev`, 6 —4 moderadas y 2 altas—. Tras actualizar Electron, `npm audit --omit=dev` informa 0 vulnerabilidades y la auditoría completa, 8 moderadas y ninguna alta.
- Las ocho advertencias restantes pertenecen a la cadena de herramientas de empaquetado: `electron-builder`, `app-builder-lib`, `@electron/get` 3.x y `global-agent` → `roarr` → `sprintf-js`. Su resolución controlada continúa pendiente; estos resultados no garantizan que todo el ecosistema de dependencias esté libre de riesgos.

## Decisiones pendientes

- Confirmar tras revisión visual si la composición, los recortes, el contraste y la densidad de los nueve temas y las ocho tarjetas son la dirección adecuada.
- Decidir si la preferencia de tema se persistirá como ajuste de aplicación cuando existan mundos reales.
- Definir los tokens y recursos admitidos por los temas `.fateworld` sin convertir el catálogo interno actual en una especificación prematura.
- Definir el futuro catálogo de capacidades mecánicas y su primera versión compatible; el v1 actual rechaza cualquier capacidad.
- Concretar la recuperación conjunta de SQLite y paquetes instalados, además de la cuarentena asistida de bases activas dañadas no vinculadas a un journal de restauración.
- Definir firma de Windows, perfil privado y condiciones de licencia antes de distribuir contenido de terceros.

## Decisiones aprobadas todavía no implementadas

- Cada personaje tendrá una ficha base permanente y progreso independiente por Crónica. Solo podrá participar en una Crónica en curso; cerrar Fatebound no lo liberará.
- Finalizar o abandonar definitivamente una Crónica liberará la ficha. El abandono será irreversible y conservará el historial consultable. Morir en una Crónica no impedirá reutilizar la ficha base en otra nueva.
- El primer motor será fiel a las mecánicas originales de Ronin. Los primeros mundos compartirán motor y variarán principalmente en ambientación, contenido y organización declarativa.
- Las tablas tendrán identificadores estables independientes de sus posiciones visibles. Cada mundo podrá reorganizar, sustituir u omitir tablas o reglas si sus referencias siguen siendo válidas.
- El paquete `.fateworld` v1 contiene identidad, contenido narrativo y tablas enlazadas; futuras versiones incorporarán definiciones mecánicas versionadas. SQLite almacenará fichas base, progreso y estado por Crónica, secundarios, clanes, relaciones, tiradas, combates, decisiones, efectos pendientes y eventos.
- El motor evolucionará de Ronin-compatible a ampliado y después especializado, preservando los mundos y partidas anteriores.
- La futura recuperación completa tendrá en cuenta SQLite y las versiones instaladas de los paquetes.

Estas decisiones no constituyen un esquema SQL, un importador ni un motor implementado. El manifiesto y las tablas narrativas v1 sí están definidos, pero no expresan todavía esas mecánicas ni el estado de juego.

## Verificación del hito `.fateworld` v1

Resultados reales comunicados por el usuario:

- `npm test`: 99/99 correctos.
- Primera ejecución de ESLint: seis errores, corregidos posteriormente.
- `npm run lint -- --quiet`: correcto tras las correcciones.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- `npm run build:win`: ejecutable portable de Windows generado.
- Pruebas específicas del validador repetidas tras corregir la comprobación de caracteres de control: 19/19 correctas.
- `npm run build:example-world`: correcto.
- SHA-256 del paquete de ejemplo antes y después de regenerarlo: idéntico, `7B87AC86C2681AE79A1D8490D3FF697CFE1368A31318BB89A8C3364F658A5B31`.

El equipo comunicó una prueba manual satisfactoria de la incorporación anterior en NTFS, incluido selector, copia, SHA-256 y duplicados. La instalación bajo `data/worlds/` no está implementada.

## Verificación pendiente del catálogo y la incorporación de paquetes

En esta tarea se sustituyó la publicación mediante enlace físico por el almacén gestionado y se ajustaron las pruebas focalizadas y la documentación. Por restricción expresa no se ejecutaron `npm test`, lint, typecheck, build, build de Windows, comprobaciones visuales automatizadas ni comandos de Git. Los 112 tests correctos con uno omitido y la prueba manual de selector, copia, SHA-256 y duplicados corresponden al estado anterior comunicado por el usuario; el protocolo `ready` y el catálogo combinado permanecen pendientes de validación por el equipo.

La comprobación manual debe repetir cancelación, carpeta ausente, paquete válido conocido y desconocido, incorporación repetida, selección de un paquete manual o gestionado ya disponible, varias versiones, mismo ID+versión con bytes distintos, ZIP inválido o incompleto, formato incompatible, enlace simbólico o junction, archivo que cambia durante la operación, dos pulsaciones rápidas, permisos insuficientes, espacio agotado y colisión de UUID. Deben probarse una unidad NTFS y unidades FAT32/exFAT reales, observando que un slot sin `ready` no aparece, que uno publicado sí aparece tras reiniciar y que ningún fallo altera el original ni paquetes previos. Las interrupciones físicas antes, durante y después de crear `ready` requieren ensayos específicos; SQLite y `data/worlds/` deben permanecer intactos.

## Migración controlada a Electron 44.7.0

Cambios registrados:

- Electron actualizado de 39.8.10 a la versión exacta 44.7.0.
- `@types/node` actualizado a la versión exacta 24.19.2.
- `package-lock.json` regenerado mediante npm.
- Electron Toolkit, electron-vite y electron-builder conservan sus versiones anteriores.
- No se han introducido overrides ni parches de dependencias.

Verificaciones realizadas y comunicadas por el usuario:

- `npm run typecheck`: correcto.
- `npm test`: 99/99 pruebas correctas.
- `npm run lint -- --quiet`: correcto.
- `npm run build`: correcto.
- `npm run build:win`: portable Windows x64 generado.
- Portable aislado: arranque e interfaz correctos.
- Cambio de idioma y persistencia después de cerrar y reabrir: correctos.
- Diagnóstico SQLite: disponible, integridad y claves foráneas correctas, esquema 1.
- Exportación manual SQLite: correcta, con manifiesto y SHA-256 verificados.
- Restauración manual: correcta; la base restaurada coincide byte por byte con la copia seleccionada.
- Copia protegida previa a la restauración: creada y verificada mediante SHA-256.
- Reapertura posterior: correcta; SQLite permanece íntegro y reconoce una copia administrada válida.

La auditoría posterior informa 0 vulnerabilidades con `npm audit --omit=dev` y 8 vulnerabilidades moderadas, ninguna alta, en el árbol completo. Las ocho advertencias de la cadena de empaquetado continúan pendientes de resolución controlada.

Las pruebas automatizadas se ejecutaron con Node 22.23.2 del equipo, no con el Node integrado en Electron 44. La ejecución real del portable sí cubrió arranque, SQLite, exportación, restauración y reapertura. La base anterior y la restaurada contenían datos idénticos, por lo que queda pendiente probar la restauración entre estados de datos diferentes. Tampoco se han probado interrupciones físicas, fallos de alimentación, falta real de espacio ni la restauración posterior a una interrupción real.

## Verificación histórica del hito de exportación

Resultados reales comunicados por el usuario:

- `npm test`: 74/74 correctos.
- `npm run lint -- --quiet`: correcto.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- `npm run build:win`: correcto; ejecutable de Windows generado.
- Exportación manual real desde Ajustes: correcta.
- Copia autocontenida con `fatebound.sqlite` y `manifest.json`: SHA-256 y tamaño coincidentes.
- `PRAGMA integrity_check`: `ok`.
- `PRAGMA foreign_key_check`: sin errores.
- `git diff --check`: sin errores; únicamente las advertencias conocidas de LF/CRLF.

Siguen pendientes y no se han realizado manualmente las pruebas excepcionales de permisos insuficientes, espacio agotado, cancelación, exportaciones repetidas sin sobrescritura y cierre de Fatebound durante copias grandes.

## Verificación del hito de restauración

Resultados reales comunicados por el usuario:

- `npm test`: 80/80 correctos.
- `npm run lint -- --quiet`: correcto.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- Portable de Windows: ejecutable generado y probado.
- Restauración manual real desde una instalación portable aislada: correcta.
- SHA-256 de la base restaurada: coincide exactamente con el backup seleccionado.
- Copia `protected`: contiene exactamente la base anterior, comprobado mediante SHA-256.
- Reapertura de Fatebound y diagnóstico SQLite posterior: correctos.
- Cancelación después de verificar una copia: sin modificación de la base ni creación de backups adicionales.
- Copia con el SHA-256 del manifiesto deliberadamente manipulado: rechazada antes de permitir la confirmación.
- Rechazo de la copia manipulada: sin modificación de la base ni creación de backups adicionales.

Estas comprobaciones se realizaron con bases técnicas de prueba, todavía sin personajes ni Crónicas. Las pruebas automatizadas cubren parte del rollback, el fallback a la copia protegida y la coordinación del IPC, pero no equivalen a haber verificado manualmente una interrupción real.

Siguen pendientes las interrupciones reales en las distintas fases y la recuperación al siguiente arranque, los fallos de permisos y espacio insuficiente, la revisión exhaustiva del flujo en inglés y coreano, las confirmaciones repetidas y otros escenarios excepcionales, y los ensayos en un pendrive físico y otro ordenador.

## Registro de cambios

### 2026-10-10

- Sustituida la pantalla de electron-vite por la primera shell de Fatebound.
- Implementadas cinco secciones y tres previsualizaciones visuales declarativas.
- Añadidos estados vacíos honestos para funciones futuras.
- Integrado el diagnóstico SQLite real y puntual mediante IPC/preload restringido.
- Retirada la API genérica del preload y activado el sandbox del renderer.
- Añadidas pruebas del catálogo visual, navegación, contrato IPC, errores sanitizados y diagnóstico real.
- Actualizada la documentación para separar interfaz real, demostraciones visuales y funciones pendientes.

Los recursos gráficos de Ronin presentes en el repositorio no autorizan su distribución pública. El renderer y el empaquetado público no los incorporan.

### 2026-10-11

- Implementado el catálogo i18n tipado para español, inglés y coreano, con selector inmediato y fallback español.
- Añadida la preferencia portable atómica `data/preferences.json` mediante IPC mínimo validado en preload y main.
- Separados los textos traducibles de los nueve YAML visuales y localizados navegación, mundos, estados, diagnóstico, mensajes nativos y accesibilidad.
- Documentada la separación permanente entre idioma de aplicación e idiomas de contenido declarados por futuros paquetes `.fateworld`.
- Sustituido el catálogo TypeScript de tres temas por nueve YAML integrados, validados y empaquetados en compilación.
- Establecido Fatebound neutral como inicio sin mundo activo y añadido el retorno explícito al estado neutral.
- Separado Fatebound neutral del catálogo visible e incorporado Mundoplato como octavo mundo futuro.
- Integradas 27 ilustraciones en Inicio, Mundos y contexto, con alternativas ante fallos.
- Sustituido definitivamente Paladín por Templario en el catálogo y la documentación.
- Añadidas pruebas de esquema, allowlist, seguridad de rutas, recursos, selección y condición no jugable.
- Integrado Inicio en la marca, Ajustes en la cabecera y un menú contextual que no confunde previsualizaciones con mundos instalados.
- Integrado el nuevo logo horizontal, el símbolo compacto y el icono de aplicación desde `resources/branding/fatebound/`.
- Adaptadas las tarjetas al formato 3:4 y simplificado el detalle para usar solo el emblema sobre una superficie temática.
- Etiquetados los ocho mundos como **Próximamente** y reservada la futura etiqueta **No instalado** para paquetes jugables disponibles.
- Adoptado Crónicas como término de navegación y documentadas sus asociaciones futuras con personaje, mundo y versión.
- Integrada `feature/app-shell` en `main`; base `67350b7` registrada con 67 tests, lint, typecheck y builds correctos e interfaz multilingüe verificada manualmente.
- Documentadas como aprobadas y todavía no implementadas las invariantes de ficha base y Crónica, el motor fiel a Ronin, los identificadores estables de tablas, la separación `.fateworld`/SQLite y la recuperación conjunta futura.
- Implementada la exportación manual de backups SQLite desde Ajustes mediante selector nativo de main, cola compartida, manifiesto verificable, destino único y resultados localizados.
- Añadidas pruebas focalizadas de exportación real, destinos activos, limpieza propia, cancelación, concurrencia y contrato IPC; la validación final del hito alcanzó 74/74 tests correctos.
- Implementada la restauración manual SQLite desde Ajustes con vista previa, confirmación explícita, IPC sin rutas, revalidación, copia previa protegida y reapertura con comprobación completa.
- Añadido un journal de sustitución y recuperación al arranque que conserva o recupera la base verificable según la fase alcanzada, sin presentar la secuencia de archivos como atómica.
- Añadidas pruebas focalizadas de restauración, rechazo e interrupción.

### 2026-10-12

- Completada la validación automatizada del hito con 80/80 tests, lint, typecheck y build correctos.
- Generado y probado el portable de Windows; restauración normal, hashes de la base restaurada y la copia `protected`, reapertura, diagnóstico, cancelación y rechazo de una copia manipulada comprobados con bases técnicas.
- Mantenidas como pendientes las interrupciones reales, los fallos de permisos o espacio, la revisión exhaustiva en inglés y coreano, las confirmaciones repetidas y las pruebas en pendrive físico y otro ordenador.
- Definido el contrato normativo `.fateworld` v1 con manifiesto, idiomas, rutas, límites, tablas enlazadas y política de capacidades desconocidas.
- Implementado el validador ZIP/YAML sin extracción ni efectos secundarios y completada su validación técnica: 99/99 pruebas totales, 19/19 específicas del validador, lint, typecheck y builds correctos.
- Añadidas las fuentes y el paquete reproducible original **Ecos de la marea** como muestra técnica no jugable.
- Confirmada la reproducción determinista de **Ecos de la marea** mediante un SHA-256 idéntico antes y después de regenerar el paquete.
- Registradas las vulnerabilidades comunicadas por `npm audit` y aplazada cualquier actualización mayor de Electron a una revisión controlada de dependencias.

### 2026-10-14

- Actualizados Electron de 39.8.10 a 44.7.0 y `@types/node` a 24.19.2, ambos con versión exacta, y regenerado `package-lock.json` mediante npm; Electron Toolkit, electron-vite y electron-builder permanecen sin cambios, sin overrides ni parches.
- Comunicadas como correctas 99/99 pruebas, lint, typecheck, build y generación del portable Windows x64.
- Validado en un portable aislado el arranque, la interfaz, la persistencia del idioma, el diagnóstico SQLite, la exportación, la restauración, la copia protegida y la reapertura.
- Reducida la auditoría de producción a 0 vulnerabilidades y la completa a 8 moderadas sin vulnerabilidades altas; la cadena de empaquetado restante continúa pendiente de resolución controlada.
- Conservadas como pendientes las pruebas con estados de datos diferentes, interrupciones físicas o de alimentación, falta real de espacio y restauración tras una interrupción real.
- Implementada, sin ejecutar validaciones por restricción de la tarea, la detección limitada y de solo lectura de paquetes `.fateworld` depositados en `worlds/` junto al portable y en `.fatebound-dev/worlds/` durante desarrollo.
- Añadido el catálogo mediante IPC sin argumentos, estados localizados en Mundos, asociación exacta de IDs conocidos, entradas neutrales para otros mundos y actualización manual sin selector ni instalación.
- Añadidas pruebas focalizadas del catálogo y actualizada la documentación; tests, lint, typecheck, builds y revisión visual quedan pendientes de ejecución por el equipo.
- Implementado **Añadir mundo** mediante selector nativo e IPC sin argumentos, con validación y copia preparada dentro de la bandeja, revalidación, publicación sin sobrescritura y actualización automática del catálogo; no instala ni toca SQLite.
- Añadidos resultados localizados para cancelación, invalidez, incompatibilidad, cambios, paquete ya disponible, conflicto y errores de copia, además de pruebas focalizadas no ejecutadas y documentación actualizada.
- Corregida la publicación para eliminar la copia directa al destino final: ahora solo se publica mediante enlace físico exclusivo y atómico; los sistemas que no lo admiten fallan de forma controlada. Añadidas pruebas no ejecutadas para esa limitación y para impedir la limpieza de una ruta final no atribuible a la operación.
- Sustituido después el enlace físico por `worlds/.fatebound-managed-v1/<uuid>/`: la copia permanece invisible hasta crear `ready`, el catálogo combina paquetes manuales y gestionados y vuelve a validar ambos sin exponer rutas al renderer.
- Añadidas pruebas focalizadas no ejecutadas para publicación gestionada, daños, estructuras inseguras, conflictos entre procedencias, colisiones y fallos alrededor de `ready`. El equipo había comunicado 112 pruebas correctas con una omitida y el flujo manual anterior correcto en NTFS; FAT32/exFAT y las interrupciones físicas continúan pendientes.

# Estado de desarrollo

Última actualización: 2026-10-11

Hito histórico documentado: exportación manual segura de backups SQLite, desarrollada originalmente en `feature/sqlite-manual-export`.

Base histórica del hito: `main` después de integrar `feature/app-shell`, último commit base `67350b7`.

Validación heredada de esa base: 67 tests correctos, lint, typecheck y builds superados; interfaz multilingüe verificada manualmente. Estos resultados son históricos y han quedado sustituidos por la validación final del hito recogida más abajo.

## Estado general

Fatebound 2.0 dispone ya de una primera interfaz visual funcional sobre Electron y Vue. La shell carga nueve temas visuales y está traducida al español, inglés y coreano, con cambio inmediato y preferencia portable. Sin un mundo activo comienza en Fatebound neutral, el menú muestra solo Mundos y Ajustes reúne el selector de idioma, el diagnóstico SQLite de solo lectura y la exportación manual de backups.

El producto continúa en fase de fundamentos: no existen todavía esquema del juego, mundos instalados, personajes, campañas, reglas ni importación `.fateworld`. Ronin, Templario, Ninja, Shaolin, Robot, Soldado, Naves y Mundoplato figuran como **Próximamente** y solo permiten explorar su ambientación; ninguno representa contenido jugable disponible o instalado.

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
- [x] Ocho tarjetas de mundo en estado inequívoco **Próximamente**, seleccionables para ambientación pero sin acciones de juego, instalación o apertura.
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
- [x] Preload reducido a diagnóstico, exportación manual y preferencia de idioma mediante operaciones específicas; retirados `electronAPI`, `ipcRenderer` expuesto y el canal `ping`.
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

### Exportación manual SQLite

- [x] Acción accesible en Ajustes con estados localizados de trabajo, éxito, cancelación y error en español, inglés y coreano.
- [x] Selector nativo de carpeta gestionado por main; el canal `fatebound:storage:export-sqlite-backup` no acepta rutas ni argumentos desde el renderer.
- [x] Copia online consistente mediante el servicio existente, serializada con escrituras, backups automáticos y cierre.
- [x] Directorio autocontenido y único con `fatebound.sqlite` y `manifest.json`, sin sobrescritura y con validación final de estructura, tamaño, SHA-256, integridad y claves foráneas.
- [x] Rechazo de destinos dentro de los datos o backups activos después de resolver su ruta real.
- [x] Limpieza limitada a temporales con marcador propio y a la candidata recién publicada que falle la validación final; cancelación sin escritura.
- [x] Copias exportadas fuera de la retención 6/2 y del estado del programador automático.

## Funciones demostrativas o pendientes

- Los ocho mundos son un catálogo interno de presentación; no son paquetes `.fateworld`, no aparecen en SQLite y no contienen reglas. Fatebound neutral es la identidad base y no forma parte de esas ocho tarjetas.
- **Próximamente** significa que el paquete jugable aún no existe; **No instalado** se reservará para un paquete futuro ya disponible pero ausente de la biblioteca local.
- La selección temática dura solo durante la sesión y comienza de nuevo en Fatebound neutral al abrir la aplicación.
- Personajes y Crónicas no aparecen en el menú sin un mundo jugable activo; sus vistas estructurales no crean, editan ni persisten datos.
- Ajustes ofrece idioma, diagnóstico y exportación manual de backups; no ofrece restauración, exploración de archivos ni cambio de la raíz activa.
- No existe todavía importador, editor de mundos, motor de reglas, campañas jugables o IA.

## Siguiente tarea prioritaria

**Diseñar la restauración explícita y la recuperación conjunta de SQLite y versiones instaladas de paquetes, sin sobrescritura silenciosa.**

## Pendientes por fases

### Seguridad y recuperación

- Diseñar el flujo de restauración y cuarentena de una base dañada.
- Diseñar la recuperación conjunta de SQLite y las versiones instaladas de paquetes que necesiten sus datos.
- Validar la aplicación desde un pendrive físico y otro ordenador.
- Probar manualmente dos ejecutables simultáneos y el cierre durante una copia grande.

### Persistencia y mundos

- Mantener pendiente la recuperación explícita, sin sobrescritura silenciosa.
- Implementar repositorios sobre la transacción central SQLite.
- Especificar y versionar definitivamente el contrato `.fateworld`.
- Implementar importación segura, versiones inmutables y vínculos exactos de personajes y crónicas.
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
- `Fatebound.exe` no tiene firma Authenticode.
- Las copias locales comparten dispositivo con la base; la exportación externa ya existe, pero depende de que el usuario elija y conserve otra unidad. La recuperación manual continúa pendiente.
- Retirar una unidad durante una escritura sigue siendo inseguro incluso con la configuración conservadora de SQLite.
- `node:sqlite` permanece ligado a la versión de Node incluida en Electron 39.
- No existe una especificación normativa de `.fateworld`, un esquema del juego ni un motor mecánico.

## Decisiones pendientes

- Confirmar tras revisión visual si la composición, los recortes, el contraste y la densidad de los nueve temas y las ocho tarjetas son la dirección adecuada.
- Decidir si la preferencia de tema se persistirá como ajuste de aplicación cuando existan mundos reales.
- Definir los tokens y recursos admitidos por los temas `.fateworld` sin convertir el catálogo interno actual en una especificación prematura.
- Definir manifiesto, esquema, límites, capacidades y traducciones del formato de mundos.
- Concretar en la futura especificación `.fateworld` el contrato independiente de idiomas disponibles y predeterminado por mundo sin inventar traducciones.
- Concretar la experiencia de restauración y cuarentena SQLite y su relación con las versiones de paquetes instaladas.
- Definir firma de Windows, perfil privado y condiciones de licencia antes de distribuir contenido de terceros.

## Decisiones aprobadas todavía no implementadas

- Cada personaje tendrá una ficha base permanente y progreso independiente por Crónica. Solo podrá participar en una Crónica en curso; cerrar Fatebound no lo liberará.
- Finalizar o abandonar definitivamente una Crónica liberará la ficha. El abandono será irreversible y conservará el historial consultable. Morir en una Crónica no impedirá reutilizar la ficha base en otra nueva.
- El primer motor será fiel a las mecánicas originales de Ronin. Los primeros mundos compartirán motor y variarán principalmente en ambientación, contenido y organización declarativa.
- Las tablas tendrán identificadores estables independientes de sus posiciones visibles. Cada mundo podrá reorganizar, sustituir u omitir tablas o reglas si sus referencias siguen siendo válidas.
- Los paquetes `.fateworld` contendrán definiciones versionadas de reglas y contenido. SQLite almacenará fichas base, progreso y estado por Crónica, secundarios, clanes, relaciones, tiradas, combates, decisiones, efectos pendientes y eventos.
- El motor evolucionará de Ronin-compatible a ampliado y después especializado, preservando los mundos y partidas anteriores.
- La futura recuperación completa tendrá en cuenta SQLite y las versiones instaladas de los paquetes.

Estas decisiones no constituyen un esquema SQL, un manifiesto `.fateworld`, un importador ni un motor implementado.

## Verificación de esta actualización

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

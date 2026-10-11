# Estado de desarrollo

Última actualización: 2026-10-11

Rama de trabajo: `feature/app-shell`

## Estado general

Fatebound 2.0 dispone ya de una primera interfaz visual funcional sobre Electron y Vue. La shell sustituye la demostración de electron-vite, separa los destinos globales de la navegación contextual y carga nueve temas YAML integrados: Fatebound como identidad base y ocho mundos futuros seleccionables. Sin un mundo activo comienza en Fatebound neutral, el menú muestra solo Mundos y Ajustes presenta un diagnóstico real y de solo lectura de la infraestructura SQLite portable.

El producto continúa en fase de fundamentos: no existen todavía esquema del juego, mundos instalados, personajes, campañas, reglas ni importación `.fateworld`. Ronin, Templario, Ninja, Shaolin, Robot, Soldado, Naves y Mundoplato figuran como **Próximamente** y solo permiten explorar su ambientación; ninguno representa contenido jugable disponible o instalado.

## Implementado y probado

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

### Diagnóstico y frontera de procesos

- [x] Canal fijo `fatebound:storage:get-diagnostics`, sin argumentos y con respuesta compartida tipada.
- [x] Preload reducido a `window.api.storage.getDiagnostics()`; retirados `electronAPI`, `ipcRenderer` expuesto y el canal `ping`.
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

## Funciones demostrativas o pendientes

- Los ocho mundos son un catálogo interno de presentación; no son paquetes `.fateworld`, no aparecen en SQLite y no contienen reglas. Fatebound neutral es la identidad base y no forma parte de esas ocho tarjetas.
- **Próximamente** significa que el paquete jugable aún no existe; **No instalado** se reservará para un paquete futuro ya disponible pero ausente de la biblioteca local.
- La selección temática dura solo durante la sesión y comienza de nuevo en Fatebound neutral al abrir la aplicación.
- Personajes y Crónicas no aparecen en el menú sin un mundo jugable activo; sus vistas estructurales no crean, editan ni persisten datos.
- Ajustes ofrece diagnóstico, no restauración, exportación, exploración de archivos ni cambio de ruta.
- No existe todavía importador, editor de mundos, motor de reglas, campañas jugables o IA.

## Siguiente tarea prioritaria

**Implementar la internacionalización de la interfaz en español, inglés y coreano y mostrar de forma independiente los idiomas de contenido disponibles en cada mundo.**

## Pendientes por fases

### Seguridad y recuperación

- Exportar copias verificadas a otra unidad sin exponer acceso general a archivos.
- Diseñar el flujo de restauración y cuarentena de una base dañada.
- Validar la aplicación desde un pendrive físico y otro ordenador.
- Probar manualmente dos ejecutables simultáneos y el cierre durante una copia grande.

### Persistencia y mundos

- Mantener pendiente la exportación manual de copias a otra unidad y la recuperación explícita, sin sobrescritura silenciosa.
- Implementar repositorios sobre la transacción central SQLite.
- Especificar y versionar definitivamente el contrato `.fateworld`.
- Implementar importación segura, versiones inmutables y vínculos exactos de personajes y crónicas.
- Asociar cada personaje y crónica a un mundo y su versión; comenzar con un personaje principal por crónica y permitir que protagonice varias.
- Preparar inicialmente paquetes con herramientas propias antes de construir un editor visual avanzado.

### Mecánicas y juego

- Implementar primero la base compatible con Ronin separando reglas, mundo y estado de partida.
- Añadir después capacidades compatibles para Robot y Soldado.
- Incorporar por último sistemas avanzados sin invalidar contenido ni partidas anteriores.
- Implementar personajes, crónicas, eventos y exportación Markdown.

## Problemas y limitaciones conocidos

- La apariencia y accesibilidad necesitan evaluación visual manual prolongada en los nueve temas, las ocho tarjetas y los tamaños extremos de ventana; las pruebas técnicas no cierran esta revisión.
- Los recursos de `builtin-themes` se identifican como ilustraciones propias integradas en Fatebound. Conviene conservar un registro formal de procedencia y derechos junto al proceso de publicación.
- El portable de Windows convierte `fatebound-app-icon.png` durante el build; `build/icon.ico` y `build/icon.icns` no se han regenerado y deben revisarse en una tarea específica si se reutilizan para otros targets.
- La portabilidad no se ha validado desde un pendrive físico ni desde otro ordenador.
- `Fatebound.exe` no tiene firma Authenticode.
- Las copias locales comparten dispositivo con la base; todavía faltan exportación externa y recuperación manual.
- Retirar una unidad durante una escritura sigue siendo inseguro incluso con la configuración conservadora de SQLite.
- `node:sqlite` permanece ligado a la versión de Node incluida en Electron 39.
- No existe una especificación normativa de `.fateworld`, un esquema del juego ni un motor mecánico.

## Decisiones pendientes

- Confirmar tras revisión visual si la composición, los recortes, el contraste y la densidad de los nueve temas y las ocho tarjetas son la dirección adecuada.
- Decidir si la preferencia de tema se persistirá como ajuste de aplicación cuando existan mundos reales.
- Diseñar la política de progreso compartido o aislado para un personaje que protagonice varias crónicas.
- Definir los tokens y recursos admitidos por los temas `.fateworld` sin convertir el catálogo interno actual en una especificación prematura.
- Definir manifiesto, esquema, límites, capacidades y traducciones del formato de mundos.
- Implementar la localización aprobada en español, inglés y coreano con preferencia persistente, y concretar el contrato independiente de idiomas disponibles y predeterminado por mundo sin inventar traducciones.
- Concretar la experiencia de exportación, restauración y cuarentena SQLite.
- Definir firma de Windows, perfil privado y condiciones de licencia antes de distribuir contenido de terceros.

## Validación de esta actualización

- `npm test`: superado, 64 pruebas; además de la navegación y el aislamiento de contexto, validan el catálogo cerrado de nueve temas, las ocho tarjetas futuras, Mundoplato, la identidad base neutral, las rutas de recursos y la ausencia de acciones jugables.
- `npm run typecheck`: superado para main/preload y renderer, también como parte del build final.
- `npm run build`: superado fuera del sandbox; contiene nueve `hero`, nueve `card` WebP y nueve `emblem` PNG, además del logo horizontal y el símbolo usados por el renderer.
- `npm run lint`: código 0 y ningún error; permanecen 2.655 avisos `prettier/prettier` por finales CRLF preexistentes.
- `npm run build:win`: superado fuera del sandbox con Electron 39.8.10; generó `dist/Fatebound.exe` de 115.339.054 bytes y SHA-256 `7593DA5BE28B02F191FA2FCD56DFA98162A5DF471A46CEFF1D2C0D67BC8EC349`.
- Inspección del paquete final: `app.asar` contiene nueve `hero`, nueve `card`, nueve `emblem`, el logo horizontal y el símbolo; `extraResources` contiene los seis PNG de marca. No hay entradas temporales ni coincidencias de contenido restringido de Ronin. electron-builder generó un `icon.ico` de 165.091 bytes desde el PNG de aplicación.
- Ejecución automatizada del portable final, fuera del sandbox y en carpeta temporal aislada: código 0, creación de `data/fatebound.sqlite` de 12.288 bytes junto al ejecutable y ningún archivo de prueba residual.
- Automatización visual del portable: Inicio usa Fatebound neutral; Mundos presenta exactamente ocho tarjetas en 4×2, todas **Próximamente**; Mundoplato abre un detalle con emblema y sin hero; a 760×620 la cuadrícula usa dos columnas y la marca compacta no se solapa con Ajustes. Volver a Inicio mediante la marca conserva la ambientación seleccionada y restablece el scroll.
- Revisión de capturas reales del portable a 1440×900 y 760×620: tarjetas verticales sin recorte importante, panel de emblema legible, estados activos claros y cabecera sin solapamientos en Inicio, Mundos y el detalle de Mundoplato.
- Firma Authenticode: `NotSigned`, limitación ya documentada.
- Revisión manual pendiente antes de commit: recorrer los nueve temas, comprobar Enter/Espacio y el orden de tabulación con teclado real, movimiento reducido, textos largos futuros, sesiones prolongadas y el icono mostrado por el shell de Windows.
- `git diff --check`: superado; Git solo avisa de la conversión futura LF/CRLF configurada para el repositorio, sin errores de espacios.
- `git status -sb`: revisado en `feature/app-shell`; conserva, además de esta fase visual, los cambios sin commit ya existentes de la shell y del diagnóstico de almacenamiento.

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
- Registrada como siguiente prioridad la internacionalización de la interfaz y los idiomas de contenido por mundo.

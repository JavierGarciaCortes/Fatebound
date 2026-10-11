# Estado de desarrollo

Última actualización: 2026-10-11

Rama de trabajo: `feature/app-shell`

## Estado general

Fatebound 2.0 dispone ya de una primera interfaz visual funcional sobre Electron y Vue. La shell carga nueve temas visuales y está traducida al español, inglés y coreano, con cambio inmediato y preferencia portable. Sin un mundo activo comienza en Fatebound neutral, el menú muestra solo Mundos y Ajustes reúne el selector de idioma y el diagnóstico SQLite de solo lectura.

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
- [x] Preload reducido a diagnóstico y preferencia de idioma mediante operaciones específicas; retirados `electronAPI`, `ipcRenderer` expuesto y el canal `ping`.
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
- Ajustes ofrece idioma y diagnóstico, no restauración, exportación, exploración de archivos ni cambio de ruta.
- No existe todavía importador, editor de mundos, motor de reglas, campañas jugables o IA.

## Siguiente tarea prioritaria

**Implementar la exportación manual de copias SQLite a otra unidad y diseñar la restauración explícita sin sobrescritura silenciosa.**

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
- Los textos ingleses y coreanos, sus saltos de línea, el hangul y el selector de idioma necesitan revisión manual en el ejecutable y en tamaños compactos.
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
- Concretar en la futura especificación `.fateworld` el contrato independiente de idiomas disponibles y predeterminado por mundo sin inventar traducciones.
- Concretar la experiencia de exportación, restauración y cuarentena SQLite.
- Definir firma de Windows, perfil privado y condiciones de licencia antes de distribuir contenido de terceros.

## Verificación pendiente de esta actualización

Por instrucción del equipo no se han ejecutado tests, lint, typecheck, builds, comprobaciones Git ni automatización visual para esta fase. Se han añadido únicamente pruebas focalizadas para coherencia de catálogos, fallback, persistencia y seguridad del IPC, pero siguen pendientes de ejecución manual.

El equipo debe ejecutar desde PowerShell `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:win`, `git diff --check` y `git status -sb`. En el portable debe comprobar los tres idiomas, reapertura con la preferencia conservada, error de guardado, navegación por teclado, diagnóstico, fechas, textos largos, hangul y tamaños 1180×780 y 760×620.

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

# Estado de desarrollo

Última actualización: 2026-10-10

Rama de trabajo: `feature/sqlite-storage`

## Estado general

Fatebound 2.0 está en fase de fundamentos. El scaffold de Electron, Vue 3 y TypeScript existe, y el proceso main ya resuelve y valida una ubicación de almacenamiento, abre SQLite y aplica sus migraciones antes de abrir la interfaz. Todavía no hay esquema del juego, mundos instalados, motor de reglas, gestión de partidas ni interfaz final. La futura aplicación podrá iniciarse legítimamente sin mundos y permitirá que el usuario importe los suyos.

Una decisión documentada no equivale a funcionalidad implementada. Todo lo descrito como **propuesto** en `docs/ARCHITECTURE.md` continúa pendiente de desarrollo y verificación.

## Completado y verificado

- [x] Proyecto inicial separado en procesos main, preload y renderer.
- [x] Configuración TypeScript estricta heredada de `@electron-toolkit/tsconfig`.
- [x] Recursos de marca presentes en `resources/branding/`.
- [x] Colección completa de 36 imágenes de clanes de Ronin en `resources/worlds/ronin/clans/`, de `1_1.png` a `6_6.png`.
- [x] Fundamentos y límites permanentes documentados en `AGENTS.md`.
- [x] Producto, comandos y estado real documentados en `README.md`.
- [x] Arquitectura propuesta documentada en `docs/ARCHITECTURE.md`.
- [x] Separación documental entre distribución pública sin contenido protegido, importación personal y compilación privada autorizada.
- [x] Requisitos de las futuras plantillas originales de mundos, sin cerrar todavía el formato Markdown.
- [x] Resolvedor central de rutas: `.fatebound-dev/data/` en desarrollo y `data/` junto al ejecutable portable en distribución.
- [x] Ruta SQLite central resuelta como `getActiveStoragePaths().databaseFile`, sin rutas fijas ni escritura en la extracción temporal.
- [x] Prueba real de escritura mediante archivo temporal exclusivo y limpieza posterior.
- [x] Flujo nativo Reintentar / Elegir otra carpeta / Salir antes de crear la ventana principal.
- [x] Carpeta alternativa validada y limitada a la sesión, sin migración ni descubrimiento automático de datos.
- [x] Apertura de SQLite exclusivamente en main después de validar la carpeta y antes de mostrar la ventana principal.
- [x] Uso de `node:sqlite`, incluido en Electron 39, sin addon nativo externo ni reconstrucción ABI adicional.
- [x] Configuración portable `journal_mode=DELETE`, `synchronous=EXTRA`, claves foráneas, extensiones deshabilitadas, `trusted_schema=OFF`, temporales en memoria y espera de bloqueos.
- [x] Migraciones SQL ordenadas, versionadas y transaccionales, con rechazo de historiales incompatibles.
- [x] Migración inicial limitada a la tabla técnica `fatebound_schema_migrations`; no se ha creado el esquema del juego.
- [x] Cierre idempotente de la conexión durante `will-quit` y antes de terminar la verificación del portable.
- [x] Dieciséis pruebas automatizadas para rutas, permisos, apertura, persistencia, migraciones, reapertura, errores y cierre, siempre sobre directorios temporales aislados.
- [x] Target `portable` x64 de electron-builder configurado para generar `dist/Fatebound.exe` sin instalador obligatorio.
- [x] Identidad de plantilla sustituida por `com.fatebound.app`, autor/producto `Fatebound` y `Fatebound.exe`; eliminadas la publicación de ejemplo y la configuración de actualizaciones.
- [x] Lista pública de recursos limitada a `resources/icon.png` y `resources/branding/`, conservando nombres, rutas relativas y contenido.
- [x] Artefacto inspeccionado directamente: contiene los ocho recursos públicos esperados y no contiene recursos de Ronin.
- [x] Uso de `PORTABLE_EXECUTABLE_DIR` comprobado en el launcher de electron-builder, en el bundle de main y mediante prueba automatizada frente a una ruta temporal de extracción.
- [x] Validación manual básica en Windows: apertura correcta, creación de `data/` junto al ejecutable, ejecución desde otra carpeta, limpieza de archivos temporales y detección de conflictos de escritura.
- [x] Flujo manual Reintentar / Elegir otra carpeta / Salir validado en el ejecutable portable.

La documentación y el scaffold existente se han revisado con las comprobaciones indicadas al final de este archivo.

## Trabajo actualmente en curso

La infraestructura inicial de SQLite portable está implementada. La base se crea o abre en la ruta activa, las migraciones se ejecutan antes de la interfaz y un fallo impide continuar. La implementación automatizada usa almacenamiento temporal aislado; la verificación del artefacto portable y sus resultados se detallan al final de este archivo. La ejecución desde un pendrive físico y desde otro ordenador sigue pendiente.

## Siguiente tarea prioritaria

**Diseñar e implementar la primera estrategia de copia de seguridad y recuperación de SQLite**, antes de ampliar el esquema con datos del juego, incluyendo el caso de una extracción insegura de la unidad.

## Pendientes por fases

### Fase 1 — Base portable y seguridad

- Sustituir las API genéricas del preload por contratos IPC mínimos, tipados y validados.
- Evaluar y activar el sandbox del renderer cuando los contratos necesarios sean compatibles.
- Ampliar las pruebas automatizadas cuando se incorporen nuevos consumidores del almacenamiento.

### Fase 2 — Persistencia y versiones

- Implementar repositorios de aplicación y transacciones sobre la conexión SQLite existente.
- Implementar copias de seguridad y recuperación ante corrupción o extracción insegura.
- Implementar mundos y versiones publicadas inmutables.
- Vincular personajes y campañas a una versión concreta del mundo.
- Permitir una instalación válida sin mundos y registrar de forma idempotente los mundos importados.
- Proteger los mundos instalados que correspondan, incluido Ronin, frente al borrado accidental.

### Fase 3 — Contenido de mundos

- Diseñar y versionar el contrato de Markdown y sus metadatos en una tarea específica.
- Crear plantillas y ejemplos originales para identificadores, tablas, dados, traducciones, efectos, condiciones e imágenes, sin contenido de Ronin.
- Implementar importación segura, validación, vista previa, edición, exportación y gestión de recursos.
- Implementar el flujo de borradores y publicación de una versión nueva.
- Implementar mundos adicionales independientes.

### Fase 4 — Juego y crónicas

- Implementar el catálogo reutilizable de efectos mecánicos y el motor de reglas.
- Implementar personajes, clanes, campañas, tiradas y consecuencias.
- Mantener un registro ordenado de acontecimientos, decisiones y notas.
- Exportar las crónicas a Markdown.

### Fase 5 — Integraciones y distribución

- Diseñar la integración opcional de IA con confirmación humana y sin autoridad sobre las reglas.
- Separar y verificar los perfiles de compilación pública y privada; el público no debe incluir contenido protegido de terceros.
- Completar la experiencia de usuario y las interfaces definitivas.
- Validar portabilidad, actualizaciones, recuperación y uso desde unidades extraíbles.

## Problemas conocidos

- La compilación pública excluye Ronin, pero todavía no existe un perfil privado separado para contenido preinstalado autorizado.
- `sandbox` está desactivado en la ventana principal.
- El preload expone todavía la API genérica de `@electron-toolkit/preload`; el contrato específico `window.api` está vacío.
- La interfaz visible es la pantalla de demostración de electron-vite.
- La portabilidad todavía no se ha validado desde un pendrive físico ni desde otro ordenador.
- `Fatebound.exe` no tiene firma Authenticode; el certificado y el proceso de firma para distribución están pendientes.
- `node:sqlite` continúa clasificado como API en desarrollo activo en Node 22; la compatibilidad queda ligada y verificada contra la versión de Node incluida en Electron 39.
- `journal_mode=DELETE` con `synchronous=EXTRA` reduce el riesgo, pero no garantiza integridad si se retira físicamente una unidad durante una escritura ni sustituye las futuras copias de seguridad.
- No existen todavía copias de seguridad, recuperación ante corrupción ni comprobación de integridad al arrancar.

## Decisiones pendientes

- Política de copias de seguridad y recuperación ante extracción insegura de una unidad.
- Esquema y versionado del contrato de importación Markdown.
- Organización concreta de las plantillas originales y estrategia de compatibilidad para importar, validar, editar y exportar sin pérdida.
- Identificadores, numeración y ciclo de publicación de versiones de mundos.
- Límites de tamaño, formatos permitidos y deduplicación de recursos importados.
- Mecanismo exacto para proteger mundos instalados frente al borrado accidental y permitir operaciones administrativas seguras.
- Procedimiento de compilación y verificación que impida mezclar artefactos públicos y privados.
- Identidad legal, certificado y custodia de credenciales para firmar los artefactos públicos de Windows.
- Licencia, atribución y condiciones aplicables a cualquier compilación privada que incluya Ronin u otro contenido de terceros.
- Alcance y proveedores posibles para la IA opcional, manteniendo el juego base completamente offline.

## Validación de esta actualización

- `npm test`: superado, 16 pruebas; las siete nuevas pruebas SQLite cubren creación, configuración, persistencia, migración pendiente, rollback, versión futura, error de apertura y cierre activo.
- `npm run lint`: superado con código 0; ESLint conserva 507 avisos históricos de Prettier por finales de línea CRLF en archivos anteriores.
- `npm run typecheck`: superado para main/preload y renderer.
- `npm run build`: superado fuera del sandbox; el primer intento dentro del entorno restringido fue bloqueado al iniciar `esbuild` con `spawn EPERM`.
- `npm run build:win`: superado fuera del sandbox. Generó `D:\Proyectos\Fatebound\dist\Fatebound.exe` (87.099.876 bytes; SHA-256 `3730C6E695FD252AF6B46F525C84B37378CAC293D242C70E7819F34349C207E4`).
- Inspección de `app.asar`: el bundle main contiene `require("node:sqlite")`, la configuración `DELETE`/`EXTRA` y el modo de verificación; no contiene `better-sqlite3` ni un binario `sqlite3.node`, porque SQLite forma parte del runtime Electron.
- Ejecución automatizada del `Fatebound.exe` portable real desde una carpeta temporal: código 0, base de 12.288 bytes creada en `data/fatebound.sqlite` junto al ejecutable, migración 1 presente y `PRAGMA integrity_check = ok`. La carpeta temporal se eliminó al terminar.
- La misma verificación sobre `win-unpacked` también terminó con código 0. Los intentos iniciales con código 9/1 no llegaron a Fatebound porque el entorno del agente imponía `ELECTRON_RUN_AS_NODE=1`; al retirarla del proceso hijo, ambos artefactos funcionaron.
- `node:sqlite` se comprobó además en el runtime instalado Electron 39.8.10 / Node 22.22.1 / SQLite 3.51.2 y en Node de desarrollo 22.23.2 / SQLite 3.51.3.
- `Get-AuthenticodeSignature dist\Fatebound.exe`: `NotSigned`; no se configuró firma en esta tarea.
- `git diff --check` y revisión final de `git diff` / `git status`: superadas; no hay cambios ajenos al alcance ni archivos temporales residuales.
- Ejecución desde un pendrive físico y desde otro ordenador: no realizada todavía.

## Registro de cambios

### 2026-10-10

- Sustituido el README de plantilla por la descripción y el estado real de Fatebound 2.0.
- Añadidas instrucciones permanentes para agentes.
- Añadido este registro de desarrollo con una única siguiente prioridad.
- Documentada la arquitectura propuesta sin implementar SQLite, el motor ni interfaces finales.
- Revisada la estrategia de mundos: distribución pública vacía, importación personal y compilación privada separada.
- Documentados los requisitos de plantillas Markdown originales sin fijar todavía su especificación.
- Implementado el resolvedor central de rutas portables y la comprobación segura de escritura.
- Añadido el flujo nativo de recuperación de permisos antes de crear la ventana principal.
- Añadidas nueve pruebas automatizadas sin incorporar dependencias.
- Conservados sin cambios los recursos y nombres existentes.
- Configurado el portable x64 de Windows con identidad de Fatebound y sin instalador obligatorio ni actualizaciones automáticas.
- Limitado y verificado el contenido público a los recursos gráficos propios; Ronin permanece en el repositorio, pero fuera del artefacto.
- Completada la validación manual básica del almacenamiento portable y establecido SQLite portable como siguiente prioridad.
- Integrado `node:sqlite` exclusivamente en main con apertura previa a la ventana y cierre durante la salida.
- Añadidas migraciones SQL transaccionales y una primera migración limitada al control de versiones.
- Adoptados `journal_mode=DELETE` y `synchronous=EXTRA` para priorizar recuperación y durabilidad en almacenamiento extraíble.
- Añadidas pruebas aisladas de apertura, persistencia, migraciones, reapertura, errores y cierre.

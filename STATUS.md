# Estado de desarrollo

Última actualización: 2026-10-10

Rama de trabajo: `feature/project-foundation`

## Estado general

Fatebound 2.0 está en fase de fundamentos. El scaffold de Electron, Vue 3 y TypeScript existe, y el proceso main ya resuelve y valida una ubicación de almacenamiento antes de abrir la interfaz. Todavía no hay SQLite, mundos instalados, motor de reglas, gestión de partidas ni interfaz final. La futura aplicación podrá iniciarse legítimamente sin mundos y permitirá que el usuario importe los suyos.

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
- [x] Rutas reservadas para SQLite, copias de seguridad, recursos de mundos y exportaciones, sin crear ni abrir la base de datos.
- [x] Prueba real de escritura mediante archivo temporal exclusivo y limpieza posterior.
- [x] Flujo nativo Reintentar / Elegir otra carpeta / Salir antes de crear la ventana principal.
- [x] Carpeta alternativa validada y limitada a la sesión, sin migración ni descubrimiento automático de datos.
- [x] Nueve pruebas automatizadas para resolución, permisos, reintento, alternativa, cancelación, salida y limpieza.
- [x] Target `portable` x64 de electron-builder configurado para generar `dist/Fatebound.exe` sin instalador obligatorio.
- [x] Identidad de plantilla sustituida por `com.fatebound.app`, autor/producto `Fatebound` y `Fatebound.exe`; eliminadas la publicación de ejemplo y la configuración de actualizaciones.
- [x] Lista pública de recursos limitada a `resources/icon.png` y `resources/branding/`, conservando nombres, rutas relativas y contenido.
- [x] Artefacto inspeccionado directamente: contiene los ocho recursos públicos esperados y no contiene recursos de Ronin.
- [x] Uso de `PORTABLE_EXECUTABLE_DIR` comprobado en el launcher de electron-builder, en el bundle de main y mediante prueba automatizada frente a una ruta temporal de extracción.
- [x] Validación manual básica en Windows: apertura correcta, creación de `data/` junto al ejecutable, ejecución desde otra carpeta, limpieza de archivos temporales y detección de conflictos de escritura.
- [x] Flujo manual Reintentar / Elegir otra carpeta / Salir validado en el ejecutable portable.

La documentación y el scaffold existente se han revisado con las comprobaciones indicadas al final de este archivo.

## Trabajo actualmente en curso

La implementación y la validación básica del almacenamiento portable están completadas. El resolvedor, la comprobación de escritura, el target de Windows y el flujo de recuperación se han verificado mediante pruebas automatizadas, inspección del artefacto y pruebas manuales confirmadas en Windows. La ejecución desde un pendrive físico y desde otro ordenador sigue pendiente.

## Siguiente tarea prioritaria

**Integrar inicialmente SQLite portable**, creando y abriendo la base de datos exclusivamente desde el proceso main en la ruta central `data/fatebound.sqlite`, con una migración inicial y pruebas que no utilicen datos reales del usuario.

## Pendientes por fases

### Fase 1 — Base portable y seguridad

- Sustituir las API genéricas del preload por contratos IPC mínimos, tipados y validados.
- Evaluar y activar el sandbox del renderer cuando los contratos necesarios sean compatibles.
- Ampliar las pruebas automatizadas cuando se incorporen nuevos consumidores del almacenamiento.

### Fase 2 — Persistencia y versiones

- Incorporar SQLite sin servidor y sus migraciones.
- Implementar repositorios, transacciones, copias de seguridad y recuperación.
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
- No existe almacenamiento persistente; las rutas de SQLite y de los futuros directorios están reservadas, pero no se crean sus contenidos.
- El proyecto no declara una versión mínima de Node.js.

## Decisiones pendientes

- Política de copias de seguridad y recuperación ante extracción insegura de una unidad.
- Estrategia de journal y recuperación de SQLite adecuada para almacenamiento extraíble.
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

- `npm test`: superado, 9 pruebas.
- `npm run lint`: superado.
- `npm run typecheck`: superado.
- `npm run build:win`: superado fuera del sandbox tras un primer intento bloqueado al iniciar `esbuild` (`spawn EPERM`). Generó `D:\Proyectos\Fatebound\dist\Fatebound.exe` (87.094.672 bytes; SHA-256 `508DA77B5C675EC229F17CE370404382E89CD45EBCEC34D806B13A092DDE1265`).
- Inspección directa del portable con 7-Zip: ocho recursos públicos presentes con sus rutas esperadas; recursos de Ronin ausentes.
- Comparación SHA-256 entre los ocho recursos originales y los empaquetados: coinciden.
- `Get-AuthenticodeSignature dist\Fatebound.exe`: `NotSigned`; no se configuró firma en esta tarea.
- Inspección de `PORTABLE_EXECUTABLE_DIR`: electron-builder lo establece desde `$EXEDIR`, el bundle de main lo consume y la prueba automatizada confirma que prevalece sobre la ruta temporal de extracción.
- `git diff --check` y revisión final de `git diff` / `git status`: superadas; los cambios corresponden al resolvedor previo, su documentación y esta configuración portable.
- Prueba manual de `Fatebound.exe` en Windows, confirmada por el equipo: apertura correcta, `data/` junto al ejecutable, funcionamiento desde otra carpeta, limpieza de archivos temporales, detección del conflicto de escritura y funcionamiento de Reintentar / Elegir otra carpeta / Salir.
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

# Estado de desarrollo

Última actualización: 2026-10-10

Rama de trabajo: `feature/project-foundation`

## Estado general

Fatebound 2.0 está en fase de fundamentos. El scaffold de Electron, Vue 3 y TypeScript existe, y se han documentado las decisiones arquitectónicas del producto. Todavía no hay SQLite, datos estructurados de Ronin, motor de reglas, gestión de partidas ni interfaz final.

Una decisión documentada no equivale a funcionalidad implementada. Todo lo descrito como **propuesto** en `docs/ARCHITECTURE.md` continúa pendiente de desarrollo y verificación.

## Completado y verificado

- [x] Proyecto inicial separado en procesos main, preload y renderer.
- [x] Configuración TypeScript estricta heredada de `@electron-toolkit/tsconfig`.
- [x] Recursos de marca presentes en `resources/branding/`.
- [x] Colección completa de 36 imágenes de clanes de Ronin en `resources/worlds/ronin/clans/`, de `1_1.png` a `6_6.png`.
- [x] Fundamentos y límites permanentes documentados en `AGENTS.md`.
- [x] Producto, comandos y estado real documentados en `README.md`.
- [x] Arquitectura propuesta documentada en `docs/ARCHITECTURE.md`.

La documentación y el scaffold existente se han revisado con las comprobaciones indicadas al final de este archivo.

## Trabajo actualmente en curso

No hay una implementación funcional en curso. La arquitectura propuesta queda preparada para revisión y aprobación antes de iniciar la primera pieza de infraestructura portable.

## Siguiente tarea prioritaria

**Implementar y probar un resolvedor único de rutas de datos portables en el proceso main**, con comportamiento explícito para desarrollo y para la futura distribución portable de Windows, sin incorporar todavía SQLite.

## Pendientes por fases

### Fase 1 — Base portable y seguridad

- Aprobar el contrato y la ubicación del directorio portable de datos.
- Configurar y verificar un target realmente portable de electron-builder para Windows.
- Sustituir las API genéricas del preload por contratos IPC mínimos, tipados y validados.
- Evaluar y activar el sandbox del renderer cuando los contratos necesarios sean compatibles.
- Corregir los metadatos de plantilla del paquete y del empaquetado.
- Añadir una estrategia inicial de pruebas automatizadas.

### Fase 2 — Persistencia y versiones

- Incorporar SQLite sin servidor y sus migraciones.
- Implementar repositorios, transacciones, copias de seguridad y recuperación.
- Implementar mundos y versiones publicadas inmutables.
- Vincular personajes y campañas a una versión concreta del mundo.
- Instalar de forma idempotente la versión incluida de Ronin, preservando el original.

### Fase 3 — Contenido de mundos

- Definir y versionar el contrato de Markdown y sus metadatos.
- Implementar importación segura, validación, vista previa y gestión de recursos.
- Implementar el editor de borradores y el flujo de publicación de una versión nueva.
- Implementar mundos adicionales independientes.

### Fase 4 — Juego y crónicas

- Implementar el catálogo reutilizable de efectos mecánicos y el motor de reglas.
- Implementar personajes, clanes, campañas, tiradas y consecuencias.
- Mantener un registro ordenado de acontecimientos, decisiones y notas.
- Exportar las crónicas a Markdown.

### Fase 5 — Integraciones y distribución

- Diseñar la integración opcional de IA con confirmación humana y sin autoridad sobre las reglas.
- Completar la experiencia de usuario y las interfaces definitivas.
- Validar portabilidad, actualizaciones, recuperación y uso desde unidades extraíbles.

## Problemas conocidos

- `electron-builder.yml` conserva valores de plantilla (`appId`, metadatos, publicación de ejemplo) y configura NSIS, no un target portable.
- `sandbox` está desactivado en la ventana principal.
- El preload expone todavía la API genérica de `@electron-toolkit/preload`; el contrato específico `window.api` está vacío.
- La interfaz visible es la pantalla de demostración de electron-vite.
- No existe almacenamiento persistente ni resolvedor de rutas portables.
- No hay script de pruebas automatizadas en `package.json`.
- El proyecto no declara una versión mínima de Node.js.

## Decisiones pendientes

- Convención exacta del directorio portable, copias de seguridad y comportamiento ante una unidad extraíble no escribible.
- Estrategia de journal y recuperación de SQLite adecuada para almacenamiento extraíble.
- Esquema y versionado del contrato de importación Markdown.
- Identificadores, numeración y ciclo de publicación de versiones de mundos.
- Límites de tamaño, formatos permitidos y deduplicación de recursos importados.
- Licencia, atribución y condiciones de distribución aplicables al contenido original integrado de Ronin.
- Alcance y proveedores posibles para la IA opcional, manteniendo el juego base completamente offline.

## Validación de esta actualización

- `npm run lint`: superado.
- `npm run typecheck`: superado.
- `npm run build`: superado. El primer intento quedó bloqueado por el sandbox al iniciar `esbuild` (`spawn EPERM`); la repetición autorizada fuera del sandbox finalizó correctamente.
- Pruebas automatizadas: no existe un script `test` en `package.json`.
- Revisión de `git diff` y `git status`: superada; el alcance final contiene únicamente `AGENTS.md`, `README.md`, `STATUS.md` y `docs/ARCHITECTURE.md`.

## Registro de cambios

### 2026-10-10

- Sustituido el README de plantilla por la descripción y el estado real de Fatebound 2.0.
- Añadidas instrucciones permanentes para agentes.
- Añadido este registro de desarrollo con una única siguiente prioridad.
- Documentada la arquitectura propuesta sin implementar SQLite, el motor ni interfaces finales.
- Conservados sin cambios los recursos y nombres existentes.

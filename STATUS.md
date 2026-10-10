# Estado de desarrollo

Última actualización: 2026-10-10

Rama de trabajo: `feature/app-shell`

## Estado general

Fatebound 2.0 está en fase de fundamentos. El scaffold de Electron, Vue 3 y TypeScript existe, y el proceso main ya resuelve y valida el almacenamiento portable, abre y comprueba SQLite, protege las migraciones y administra copias automáticas verificadas. La interfaz visible sigue siendo la demostración de electron-vite: todavía no hay shell de producto, mundos instalados, esquema del juego, motor de reglas, personajes ni campañas.

La visión aprobada es una aplicación portable de Windows para rol narrativo en solitario, con la experiencia de un **RPG cinematográfico y diario de aventuras**. Las decisiones de producto, diseño y compatibilidad descritas en esta actualización son dirección para las fases futuras; no equivalen a funcionalidad implementada.

## Implementado y comprobado con anterioridad

- [x] Separación de procesos main, preload y renderer, con TypeScript estricto.
- [x] Resolvedor central de rutas: `.fatebound-dev/data/` en desarrollo y `data/` junto al ejecutable portable en distribución.
- [x] Validación de escritura y flujo Reintentar / Elegir otra carpeta / Salir antes de crear la ventana principal.
- [x] SQLite mediante `node:sqlite`, exclusivamente en main y en `getActiveStoragePaths().databaseFile`.
- [x] Configuración portable `journal_mode=DELETE`, `synchronous=EXTRA`, claves foráneas, extensiones deshabilitadas y temporales en memoria.
- [x] Comprobaciones de integridad, migraciones SQL versionadas y transaccionales y copia obligatoria previa a una migración pendiente.
- [x] Copias consistentes mediante `backup()`, manifiesto portable, SHA-256, verificación, programación tras cambios confirmados y retención segura de seis automáticas y dos protegidas.
- [x] Exclusión mutua entre escrituras, copias y cierre, y bloqueo de instancia única antes de acceder a SQLite.
- [x] Cuarenta y ocho pruebas automatizadas aisladas para almacenamiento, integridad, migraciones, copias, programación, retención y cierre.
- [x] Target portable x64 de Windows e inspección previa del artefacto sin addon SQLite externo ni contenido de Ronin.
- [x] Recursos de marca propios conservados en `resources/branding/`.

Estas comprobaciones pertenecen a las tareas de almacenamiento anteriores. No se han repetido en esta actualización exclusivamente documental.

## Dirección aprobada, todavía no implementada

- [ ] Shell compartido atractivo, navegación clara y una pantalla de inicio que se perciba como aventura, no como panel administrativo.
- [ ] Selección visual de mundos con demostraciones claramente identificadas que cambien de forma perceptible la ambientación sin alterar la navegación común.
- [ ] Estados honestos para personajes y partidas futuras, sin simular funciones inexistentes.
- [ ] Diagnóstico de almacenamiento y SQLite de solo lectura mediante un contrato IPC estrecho y validado.
- [ ] Paquetes ZIP instalables, con extensión propuesta `.fateworld`, formados por Markdown, YAML, imágenes, recursos y temas declarativos; la especificación técnica sigue abierta.
- [ ] Coexistencia de versiones de mundos y vínculo exacto de personajes y campañas a la versión usada.
- [ ] Evolución mecánica compatible en tres etapas: base compatible con Ronin; extensiones compatibles para Robot y Soldado; y sistemas avanzados, por ejemplo naves, escudos y armas.
- [ ] Edición y exportación futura de mundos sin ejecutar código ni estilos arbitrarios procedentes de paquetes.

## Trabajo de esta actualización

- Formalizada la visión de producto y la dirección de la primera interfaz.
- Documentado el sistema visual común y su capa de ambientación por mundo.
- Documentada la dirección del formato de mundos, sus invariantes de seguridad y las cuestiones que siguen abiertas.
- Ordenada la evolución mecánica con una política de compatibilidad acumulativa.
- Reforzadas en `AGENTS.md` las restricciones permanentes de interfaz, seguridad, accesibilidad y compatibilidad.

No se ha modificado código, configuración, recursos ni dependencias.

## Siguiente tarea prioritaria

**Implementar la primera interfaz funcional de Electron/Vue**: shell compartido, navegación, inicio y selección visual de mundos de demostración, variaciones temáticas declarativas, estados futuros honestos, marca existente y diagnóstico de almacenamiento SQLite de solo lectura mediante IPC/preload mínimo y seguro; verificarla en el portable de Windows.

## Pendientes por fases

### Interfaz funcional inicial

- Sustituir la demostración de electron-vite por el shell de Fatebound.
- Retirar las API genéricas del preload al introducir el contrato mínimo para diagnóstico.
- Evaluar y activar el sandbox del renderer cuando esos contratos sean compatibles.
- Construir temas de demostración originales, accesibles y claramente etiquetados.
- Validar navegación por teclado, contraste, movimiento reducido y sesiones largas.

### Persistencia y mundos

- Implementar repositorios sobre la transacción central SQLite existente.
- Implementar exportación manual de copias a otra unidad y restauración explícita sin sobrescritura silenciosa.
- Especificar y versionar definitivamente el contrato `.fateworld` en una tarea dedicada.
- Implementar importación segura, validación, versiones inmutables y vínculos exactos de personajes y campañas.
- Permitir inicialmente preparar paquetes con herramientas propias sin construir un editor visual avanzado.

### Mecánicas y juego

- Implementar primero la base compatible con Ronin separando reglas, datos del mundo y estado de partida.
- Añadir después capacidades compatibles para Robot y Soldado sin invalidar el contenido de la primera fase.
- Incorporar por último sistemas avanzados y especializados, incluidos los de naves, manteniendo compatibilidad o migraciones explícitas.
- Implementar personajes, campañas, eventos, crónicas y exportación Markdown.

### Distribución e integraciones futuras

- Separar y verificar los perfiles de compilación pública y privada.
- Resolver licencia y atribución antes de preinstalar Ronin u otro contenido de terceros.
- Diseñar, solo en una fase posterior, una integración opcional de IA sin autoridad sobre las reglas.

## Problemas conocidos

- La interfaz visible continúa siendo la demo de electron-vite.
- `sandbox` está desactivado y el preload expone todavía la API genérica de `@electron-toolkit/preload`; `window.api` está vacío.
- La portabilidad no se ha validado desde un pendrive físico ni desde otro ordenador.
- `Fatebound.exe` no tiene firma Authenticode.
- `node:sqlite` sigue ligado a la versión de Node incluida en Electron 39.
- Retirar una unidad durante una escritura sigue siendo inseguro incluso con `journal_mode=DELETE` y `synchronous=EXTRA`.
- Las copias locales comparten dispositivo con la base; todavía faltan exportación externa y recuperación manual.
- La prueba real de dos ejecutables simultáneos y el cierre del portable durante una copia grande siguen pendientes.
- No existe todavía una especificación normativa de `.fateworld`, un esquema del juego ni un motor mecánico.

## Decisiones pendientes

- Nombre definitivo, versión del manifiesto, esquema, límites y política de capacidades de `.fateworld`.
- Frontera exacta entre Markdown narrativo y YAML estructurado, y estrategia de traducciones.
- Tokens visuales definitivos, tipografías distribuibles y criterios medibles de contraste por tema.
- Campos exactos del diagnóstico de almacenamiento que pueden exponerse al renderer sin revelar rutas sensibles.
- Modelo de compatibilidad y migración para cada ampliación mecánica.
- Interfaz y flujo exactos de exportación de copias, restauración manual y cuarentena de una base dañada.
- Procedimiento de compilación privada, licencia, atribución, firma de Windows y custodia de credenciales.

## Validación de esta actualización

- Revisión cruzada de `AGENTS.md`, `README.md`, `STATUS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_FORMAT.md` y `docs/DESIGN_SYSTEM.md`: completada; la visión, el estado real, la siguiente prioridad y los límites coinciden.
- `git diff --check`: superado; Git solo mostró avisos informativos sobre la conversión futura de LF a CRLF en cuatro documentos existentes.
- `git status -sb`: rama `feature/app-shell`; solo aparecen modificados los cuatro documentos requeridos existentes y como nuevos los dos documentos requeridos.
- Pruebas, lint, typecheck y builds: no ejecutados, de acuerdo con el alcance exclusivamente documental y la prohibición expresa de esta tarea.

## Registro de cambios

### 2026-10-10

- Documentada la visión de Fatebound como RPG narrativo portable y diario de aventuras.
- Establecida la dirección visual compartida y las ambientaciones orientativas por mundo.
- Creado el documento de dirección y requisitos abiertos para paquetes de mundos.
- Organizada la hoja de ruta mecánica compatible en tres fases.
- Definida como siguiente prioridad la primera interfaz funcional con diagnóstico seguro de SQLite.
- Conservado como pendiente el trabajo de exportación y restauración de copias.

Los recursos gráficos de Ronin presentes en el repositorio no autorizan su distribución pública. Una contraseña u ofuscación no modifica las condiciones de licencia y no forma parte del diseño de distribución.

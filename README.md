# Fatebound 2.0

Fatebound es una aplicación de escritorio para Windows destinada a jugar RPG narrativos en solitario. El objetivo es ofrecer una experiencia local y portable: las reglas, los mundos, las partidas y sus crónicas podrán viajar junto a la aplicación y el juego no dependerá de un servidor ni de conexión a Internet.

El repositorio se encuentra en una fase inicial de fundamentos. Actualmente contiene el scaffold funcional de Electron y Vue y la infraestructura inicial de persistencia SQLite portable; el esquema del juego, el motor, la importación de mundos y las interfaces definitivas todavía no están implementados.

## Tecnologías

- Electron 39
- Vue 3
- TypeScript 5 en modo estricto
- electron-vite 5 y Vite 7
- ESLint y Prettier
- electron-builder
- SQLite integrado en Electron mediante `node:sqlite`

## Requisitos de desarrollo

- Node.js y npm.
- Un entorno Windows para validar el objetivo de distribución de la aplicación.

El proyecto requiere Node.js 22.18 o posterior para disponer de las opciones de `node:sqlite` usadas por la infraestructura. La base actual se ha comprobado con Node.js 22.23.2 y npm 10. `package-lock.json` debe mantenerse para obtener instalaciones reproducibles.

## Instalación y comandos

Instala las dependencias bloqueadas:

```bash
npm ci
```

Los comandos siguientes proceden de `package.json`:

| Comando                | Uso                                                            |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Inicia Electron con recarga durante el desarrollo.             |
| `npm run start`        | Abre en modo preview una compilación ya generada.              |
| `npm run lint`         | Ejecuta ESLint.                                                |
| `npm test`             | Ejecuta las pruebas del almacenamiento portable y SQLite.      |
| `npm run typecheck`    | Comprueba los tipos de main, preload y renderer.               |
| `npm run build`        | Comprueba tipos y genera la aplicación con electron-vite.      |
| `npm run build:unpack` | Genera una distribución sin empaquetar.                        |
| `npm run build:win`    | Genera `dist/Fatebound.exe`, el portable de Windows x64.       |
| `npm run format`       | Formatea el repositorio con Prettier y modifica archivos.      |

Fatebound 2.0 tiene Windows como plataforma objetivo. `npm run build:win` comprueba los tipos, compila la aplicación y genera un único ejecutable portable x64 en `dist/Fatebound.exe`; no genera ni exige un instalador. El artefacto se identifica como Fatebound mediante `com.fatebound.app`, `Fatebound` y `Fatebound.exe`.

El empaquetado público usa una lista explícita de recursos propios: conserva `resources/icon.png` y los archivos de `resources/branding/` con sus nombres y rutas relativas. Los recursos de Ronin presentes en el repositorio quedan excluidos. No hay configuración de publicación ni de actualización automática.

El ejecutable generado actualmente no tiene firma Authenticode. Windows puede mostrar una advertencia de editor desconocido hasta que se defina el certificado y el procedimiento de firma para una distribución pública.

## Arquitectura general

La aplicación conserva los tres contextos de Electron:

- `src/main/`: ciclo de vida, ventanas, conexión SQLite y, en el futuro, servicios de aplicación y acceso controlado a archivos.
- `src/preload/`: frontera segura y tipada entre Electron y la interfaz.
- `src/renderer/`: interfaz Vue sin acceso directo a SQLite o al sistema de archivos.

El proceso main contiene un resolvedor central de rutas portables, valida la escritura y abre SQLite antes de mostrar la ventana principal. La arquitectura futura añadirá servicios de dominio y repositorios detrás de contratos IPC mínimos. Los recursos incluidos serán de solo lectura; los datos mutables se guardan en una ubicación resuelta en tiempo de ejecución, nunca en rutas absolutas específicas de un equipo ni dentro de `app.asar`.

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para ver el diseño propuesto y sus límites.

## Almacenamiento portable

El almacenamiento se prepara íntegramente en el proceso main:

- en desarrollo se utiliza `.fatebound-dev/data/` dentro del proyecto, aislado de cualquier instalación real y excluido de Git;
- en una distribución se utiliza `data/` junto al ejecutable portable; el launcher de electron-builder comunica su directorio original mediante `PORTABLE_EXECUTABLE_DIR`, evitando la carpeta temporal en la que se extrae la aplicación;
- la conexión SQLite se crea o abre exclusivamente en main mediante `getActiveStoragePaths().databaseFile`, después de validar la carpeta y antes de mostrar la ventana;
- antes de abrir la interfaz se crea un archivo temporal exclusivo, se escribe en él y se elimina para comprobar permisos reales.

La base se guarda como `data/fatebound.sqlite`. En desarrollo queda bajo `.fatebound-dev/data/`; en el portable queda junto a `Fatebound.exe`, nunca en el directorio temporal donde el launcher extrae la aplicación. La migración inicial crea únicamente `fatebound_schema_migrations`: todavía no existen tablas de mundos, personajes, clanes, campañas o eventos.

Cada migración tiene versión, nombre y SQL integrados en la aplicación. Las pendientes se aplican en orden y cada una usa su propia transacción `BEGIN IMMEDIATE`/`COMMIT`; un fallo ejecuta `ROLLBACK` y bloquea el arranque. También se rechaza una base cuya historia sea más nueva o no coincida con la aplicación.

Para favorecer la recuperación en unidades extraíbles se usa el journal clásico `DELETE` con `synchronous=EXTRA`, además de claves foráneas activas, extensiones deshabilitadas, `trusted_schema=OFF`, temporales en memoria y una espera de bloqueos de cinco segundos. Esta elección reduce los archivos persistentes auxiliares y conserva el rollback journal junto a la base si una escritura se interrumpe, a costa de más operaciones de sincronización y menor rendimiento que WAL. No hace segura la extracción física durante una escritura: deben cerrarse Fatebound y las escrituras pendientes antes de retirar la unidad.

Fatebound usa `node:sqlite`, integrado en el Node 22 de Electron 39, en vez de añadir un addon nativo externo. Esto elimina reconstrucciones por ABI y reglas especiales de `asar`; la API todavía está clasificada por Node como desarrollo activo, por lo que la versión de Electron permanece controlada y el portable se prueba directamente. El argumento técnico `--verify-portable-sqlite` permite que el ejecutable abra, migre y cierre la base sin mostrar la ventana, pensado únicamente para esa comprobación automatizable.

Si la prueba falla, un diálogo nativo permite **Reintentar**, **Elegir otra carpeta** o **Salir**. La carpeta alternativa también se valida, solo se conserva durante la sesión y no provoca copias, migraciones ni búsquedas de datos anteriores. Fatebound nunca cambia automáticamente a otra ubicación.

La validación manual básica en Windows está completada: el ejecutable se abre, crea `data/` a su lado, funciona desde una carpeta independiente del proyecto, limpia el archivo temporal de comprobación, detecta un conflicto de escritura y permite usar correctamente las tres acciones de recuperación. Todavía no se ha validado la ejecución desde un pendrive físico ni desde otro ordenador.

## Mundos y distribución

Fatebound debe poder distribuirse públicamente sin mundos instalados y sin incorporar contenido protegido de terceros. Una instalación vacía será un estado válido: el usuario podrá importar sus propios mundos desde Markdown, incluido Ronin para uso personal cuando disponga legítimamente de ese contenido.

Ronin, de Tiago Junges, no forma parte obligatoria de la distribución pública. Cuando el usuario lo instale, Fatebound conservará intacta su versión importada, creará versiones nuevas para las modificaciones y la protegerá frente al borrado accidental en el gestor de mundos. Sus reglas, contenido y recursos permanecerán separados de las partidas.

Se contempla una compilación privada distinta, con Ronin preinstalado. Esa variante deberá mantenerse separada de cualquier artefacto público y solo podrá generarse o distribuirse en el marco de los permisos aplicables. No se usarán contraseñas ni mecanismos de ocultación como sustituto de las condiciones de licencia.

El repositorio conserva actualmente recursos gráficos en `resources/worlds/ronin/`, incluidas las 36 combinaciones `1_1.png` a `6_6.png` de clanes. Su presencia en el repositorio no implica que deban incorporarse a una distribución pública: el target portable actual los excluye expresamente. La posible compilación privada todavía no está configurada. El contenido estructurado de Ronin no se ha importado ni instalado en una base de datos.

Los demás mundos serán independientes y seguirán el mismo modelo de importación, validación, edición, versionado y exportación. El contenido importado se tratará siempre como datos, no como código ejecutable.

## Plantillas de mundos

Está previsto incluir plantillas y ejemplos Markdown originales de Fatebound para ayudar a crear mundos sin reutilizar contenido del reglamento de Ronin ni de otros terceros. Deberán explicar cómo representar:

- identificadores estables y metadatos básicos;
- tablas y resultados de dados;
- textos y traducciones;
- efectos mecánicos y sus parámetros;
- condiciones y referencias entre elementos;
- referencias relativas a imágenes y otros recursos.

El formato deberá permitir importar, validar, editar y exportar un mundo sin pérdida de información. Estos son requisitos de diseño, no una especificación definitiva: la sintaxis, el esquema, la organización de archivos y su versionado se definirán en una tarea posterior.

## Estado actual

### Disponible ahora

- Scaffold de Electron, Vue 3 y TypeScript.
- Separación física inicial entre main, preload y renderer.
- Flujo de desarrollo, lint, comprobación de tipos y build.
- Resolución central de rutas de almacenamiento para desarrollo y aplicación distribuida.
- Comprobación real de escritura con limpieza del archivo temporal y flujo seguro de recuperación.
- Pruebas automatizadas del resolvedor y del arranque sin usar carpetas reales del usuario.
- Apertura y cierre de SQLite exclusivamente en main, con configuración conservadora para almacenamiento extraíble.
- Migraciones SQL versionadas y transaccionales con una única migración técnica inicial.
- Pruebas SQLite aisladas para creación, persistencia, migraciones, reapertura, errores y cierre.
- Recursos de marca y las imágenes de clanes de Ronin presentes en el repositorio, sin mover ni renombrar.
- Target portable x64 de Windows con identidad de Fatebound y recursos públicos incluidos mediante una lista explícita.
- Artefacto `dist/Fatebound.exe` generado e inspeccionado sin contenido de Ronin ni configuración de actualización automática.
- Validación manual básica del portable en Windows, incluida la ubicación de `data/` y el flujo completo ante conflictos de escritura.
- Documentación de producto, estado y arquitectura propuesta.

### Planificado

- Copias de seguridad, recuperación y repositorios del dominio sobre SQLite.
- Validación del portable desde un pendrive físico y desde otro ordenador.
- Instalaciones válidas sin mundos, importación personal y protección frente al borrado accidental.
- Separación de compilaciones públicas sin contenido protegido y compilaciones privadas autorizadas.
- Plantillas originales e importador, validador, editor y exportador de Markdown.
- Catálogo de efectos mecánicos y motor de reglas.
- Personajes, clanes, campañas, registro de eventos y exportación de crónicas a Markdown.
- Integración opcional de IA bajo confirmación del jugador; jugar seguirá siendo posible sin conexión.

El seguimiento detallado, las comprobaciones realizadas y la única siguiente prioridad se mantienen en [STATUS.md](STATUS.md).

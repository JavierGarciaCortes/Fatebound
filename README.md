# Fatebound 2.0

Fatebound es una aplicación de escritorio para Windows destinada a jugar RPG narrativos en solitario. El objetivo es ofrecer una experiencia local y portable: las reglas, los mundos, las partidas y sus crónicas podrán viajar junto a la aplicación y el juego no dependerá de un servidor ni de conexión a Internet.

El repositorio se encuentra en una fase inicial de fundamentos. Actualmente contiene el scaffold funcional de Electron y Vue; la persistencia, el motor de juego, la importación de mundos y las interfaces definitivas todavía no están implementados.

## Tecnologías

- Electron 39
- Vue 3
- TypeScript 5 en modo estricto
- electron-vite 5 y Vite 7
- ESLint y Prettier
- electron-builder
- SQLite como almacenamiento principal planificado, todavía no instalado

## Requisitos de desarrollo

- Node.js y npm.
- Un entorno Windows para validar el objetivo de distribución de la aplicación.

El proyecto no declara todavía una versión mínima de Node.js. La base actual se ha comprobado con Node.js 22 y npm 10. `package-lock.json` debe mantenerse para obtener instalaciones reproducibles.

## Instalación y comandos

Instala las dependencias bloqueadas:

```bash
npm ci
```

Los comandos siguientes proceden de `package.json`:

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia Electron con recarga durante el desarrollo. |
| `npm run start` | Abre en modo preview una compilación ya generada. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run typecheck` | Comprueba los tipos de main, preload y renderer. |
| `npm run build` | Comprueba tipos y genera la aplicación con electron-vite. |
| `npm run build:unpack` | Genera una distribución sin empaquetar. |
| `npm run build:win` | Genera la distribución de Windows configurada. |
| `npm run format` | Formatea el repositorio con Prettier y modifica archivos. |

También existen scripts de empaquetado para macOS y Linux heredados de la plantilla. Fatebound 2.0 tiene Windows como plataforma objetivo. La configuración actual de `build:win` genera un instalador NSIS; el target portable aún debe diseñarse, implementarse y verificarse.

## Arquitectura general

La aplicación conserva los tres contextos de Electron:

- `src/main/`: ciclo de vida, ventanas y, en el futuro, servicios de aplicación, SQLite y acceso controlado a archivos.
- `src/preload/`: frontera segura y tipada entre Electron y la interfaz.
- `src/renderer/`: interfaz Vue sin acceso directo a SQLite o al sistema de archivos.

La arquitectura propuesta añade servicios de dominio, repositorios y un resolvedor central de rutas portables detrás de contratos IPC mínimos. Los recursos incluidos serán de solo lectura; los datos mutables se guardarán en una ubicación portable resuelta en tiempo de ejecución, nunca en rutas absolutas ni dentro de `app.asar`.

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para ver el diseño propuesto y sus límites.

## Mundos y distribución

Fatebound debe poder distribuirse públicamente sin mundos instalados y sin incorporar contenido protegido de terceros. Una instalación vacía será un estado válido: el usuario podrá importar sus propios mundos desde Markdown, incluido Ronin para uso personal cuando disponga legítimamente de ese contenido.

Ronin, de Tiago Junges, no forma parte obligatoria de la distribución pública. Cuando el usuario lo instale, Fatebound conservará intacta su versión importada, creará versiones nuevas para las modificaciones y la protegerá frente al borrado accidental en el gestor de mundos. Sus reglas, contenido y recursos permanecerán separados de las partidas.

Se contempla una compilación privada distinta, con Ronin preinstalado. Esa variante deberá mantenerse separada de cualquier artefacto público y solo podrá generarse o distribuirse en el marco de los permisos aplicables. No se usarán contraseñas ni mecanismos de ocultación como sustituto de las condiciones de licencia.

El repositorio conserva actualmente recursos gráficos en `resources/worlds/ronin/`, incluidas las 36 combinaciones `1_1.png` a `6_6.png` de clanes. Su presencia en el repositorio no implica que deban incorporarse a una distribución pública; el empaquetado público y privado todavía no está separado. El contenido estructurado de Ronin no se ha importado ni instalado en una base de datos.

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
- Recursos de marca y las imágenes de clanes de Ronin presentes en el repositorio, sin mover ni renombrar.
- Documentación de producto, estado y arquitectura propuesta.

### Planificado

- Resolución de rutas y empaquetado portable para Windows.
- SQLite, migraciones, copias de seguridad y versionado inmutable de mundos.
- Instalaciones válidas sin mundos, importación personal y protección frente al borrado accidental.
- Separación de compilaciones públicas sin contenido protegido y compilaciones privadas autorizadas.
- Plantillas originales e importador, validador, editor y exportador de Markdown.
- Catálogo de efectos mecánicos y motor de reglas.
- Personajes, clanes, campañas, registro de eventos y exportación de crónicas a Markdown.
- Integración opcional de IA bajo confirmación del jugador; jugar seguirá siendo posible sin conexión.

El seguimiento detallado, las comprobaciones realizadas y la única siguiente prioridad se mantienen en [STATUS.md](STATUS.md).

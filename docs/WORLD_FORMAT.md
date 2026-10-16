# Formato técnico `.fateworld` v1

Estado del documento: especificación normativa de la v1 en desarrollo y del validador estructural implementado; instalación y ejecución del motor pendientes.

Última actualización: 2026-10-16.

## 1. Alcance y perfiles

Un `.fateworld` v1 es un ZIP declarativo autocontenido. No contiene estado de juego, código ejecutable, scripts, CSS ni acceso a API nativas. El validador de `src/main/worlds/` lo inspecciona sin extraerlo, instalarlo, modificar SQLite ni ejecutar operaciones.

La v1 de desarrollo mantiene dos perfiles explícitos:

- **Narrativo:** es el contrato original de **Ecos de la marea**. Contiene Markdown por idioma y un único archivo de tablas narrativas enlazadas. Su interpretación y validación se conservan.
- **Basic:** se identifica exclusivamente porque `compatibility` declara `engine: basic` y `engineVersion: 1.0.0`. Contiene varios archivos de tablas declarativas, `gameplay.yaml`, catálogos de contenido e imágenes de presentación.

La presencia de nombres de archivo, IDs o rutas concretas nunca decide el perfil. Si aparece `engine` o `engineVersion`, el paquete se trata como candidato Basic y debe completar exactamente ese contrato; no puede caer silenciosamente al perfil narrativo. Motores, versiones, capacidades, campos y combinaciones no admitidos se rechazan.

Las palabras **DEBE**, **NO DEBE**, **PUEDE** y **SE RECHAZA** expresan requisitos del formato. Que un paquete Basic supere este validador significa solo que su estructura declarativa es coherente. Fatebound todavía no valida estrictamente cada operación y sus parámetros, no ejecuta el motor y no considera instalado ni jugable un paquete disponible.

## 2. Contenedor y archivos

El archivo instalable DEBE usar la extensión `.fateworld`; la extensión no sustituye la inspección real del ZIP. El contenedor DEBE ser un ZIP válido, de un solo disco y sin cifrado. Solo se admiten entradas Stored o Deflate.

El perfil narrativo admite:

```text
manifest.yaml
content/<idioma>/*.md
data/*.yaml
assets/images/**/*.{png,jpg,jpeg,webp}
```

El perfil Basic admite además:

```text
data/tables/**/*.yaml
locales/<idioma>/**/*.yaml
```

Las entradas explícitas de directorio son opcionales. Si existen, deben estar vacías, ser directorios ordinarios y preceder a algún archivo real. Todos los archivos regulares deben estar declarados por `manifest.yaml`; se rechazan archivos adicionales incluso si su extensión sería admisible.

No se admiten JavaScript, TypeScript, HTML, CSS, SVG, ejecutables, bibliotecas, fuentes, SQL, módulos, plugins ni configuraciones capaces de ampliar privilegios.

## 3. Rutas internas

Todas las rutas del ZIP y del manifiesto:

- son relativas a la raíz y usan `/`;
- están normalizadas como Unicode NFC;
- no comienzan ni terminan en `/` cuando representan un archivo;
- no contienen `\`, unidades Windows, segmentos vacíos, `.` o `..`;
- no contienen controles ni los caracteres Windows `< > : " | ? *`;
- no usan segmentos terminados en punto o espacio ni nombres reservados como `CON`, `PRN`, `AUX`, `NUL`, `COM1` o `LPT1`;
- tienen como máximo 240 caracteres, ocho segmentos y 80 caracteres por segmento.

Las colisiones se comparan con la ruta NFC en minúsculas. Se rechazan duplicados, colisiones como `Tables.yaml`/`tables.yaml` y cualquier uso de un archivo como directorio. El validador resuelve referencias únicamente contra el índice del ZIP y no concatena rutas con una carpeta de destino.

## 4. Campos comunes del manifiesto

Ambos perfiles comparten:

```yaml
formatVersion: '1'
world:
  id: com.example.my-world
  version: 1.0.0
  titles:
    es: Mi mundo
  defaultLanguage: es
  languages:
    - es
content:
  descriptions:
    es: content/es/description.md
```

- `formatVersion` DEBE ser exactamente la cadena `'1'`.
- `world.id` es una identidad estable en minúsculas de hasta 100 caracteres y con al menos un separador `.` o `-`.
- `world.version` DEBE ser una versión semántica completa e independiente de `formatVersion` y de la versión del motor.
- La pareja `world.id` + `world.version` identifica una publicación inmutable.
- `world.languages` contiene entre uno y dieciséis identificadores BCP 47 canónicos y únicos. `world.defaultLanguage` pertenece a esa lista.
- `world.titles` y `content.descriptions` contienen exactamente los idiomas declarados.
- Cada descripción apunta a un `.md` bajo `content/<idioma>/`. El Markdown es UTF-8, no contiene NUL, HTML incrustado ni destinos remotos escritos como enlaces Markdown.

El idioma de la aplicación es independiente de los idiomas del paquete. Fatebound no inventa traducciones ausentes.

## 5. Perfil narrativo

El manifiesto narrativo conserva exactamente esta forma cerrada:

```yaml
compatibility:
  requiredCapabilities: []
data:
  tables: data/tables.yaml
resources:
  images: []
```

`data.tables` apunta a un único YAML bajo `data/`. `resources.images` declara rutas únicas y en minúsculas bajo `assets/images/`, con extensiones PNG, JPEG o WebP. `requiredCapabilities` debe permanecer vacío.

El archivo de tablas narrativas contiene exactamente `tables`. Cada tabla tiene `id`, títulos para todos los idiomas y una o más entradas. Cada entrada tiene `id`, textos completos y una lista de referencias. Los IDs son estables, las tablas son únicas en el paquete y las entradas son únicas dentro de su tabla. Cada referencia resuelve una tabla y, si declara `entryId`, una entrada real. Los límites siguen siendo 128 tablas, 4096 entradas y 8192 referencias.

Este perfil sigue siendo el usado por **Ecos de la marea** y no se reinterpreta como Basic.

## 6. Perfil Basic 1.0.0

El manifiesto Basic exige los bloques siguientes y rechaza campos adicionales:

```yaml
compatibility:
  engine: basic
  engineVersion: 1.0.0
  requiredCapabilities: []
data:
  gameplay: data/gameplay.yaml
  tables:
    - data/tables/example.yaml
localization:
  catalogs:
    es:
      - locales/es/ui.yaml
      - locales/es/tables/example.yaml
resources:
  images:
    - assets/images/hero.webp
    - assets/images/card.webp
    - assets/images/emblem.png
  presentation:
    hero: assets/images/hero.webp
    card: assets/images/card.webp
    emblem: assets/images/emblem.png
```

- `engine` y `engineVersion` son obligatorios y valen exactamente `basic` y `1.0.0`.
- `requiredCapabilities` debe ser una lista vacía.
- `data.tables` contiene rutas únicas y en minúsculas bajo `data/tables/`.
- `data.gameplay` apunta a un YAML único bajo `data/`.
- `localization.catalogs` contiene exactamente los idiomas del mundo. Cada ruta es única, está bajo `locales/<idioma>/` y existe.
- `resources.presentation` contiene exactamente `hero`, `card` y `emblem`. Cada valor debe ser una imagen previamente declarada en `resources.images` y con firma binaria válida.

### 6.1 Tablas Basic

Cada archivo contiene exactamente una tabla con `id`, `selector`, `entries` y, cuando corresponde, `optionalEnding`. El ID de tabla es único en todo el paquete. Cada entrada contiene exactamente `id`, `when` y `outcome`; su ID es único dentro de la tabla.

Se reconocen cuatro selectores:

- `d6`: solo `type: d6`; `when.faces` es una lista no vacía y sin duplicados de cadenas entre `'1'` y `'6'`.
- `yin_yang`: solo `type: yin_yang`; `when.yin` y `when.yang` son listas no vacías y sin duplicados de cadenas entre `'1'` y `'6'`.
- `value_range`: `type: value_range` y un `valueSource` estable; `when.range` declara `min` y puede declarar `max`, ambos como cadenas enteras.
- `matrix`: `type: matrix`, listas únicas y no vacías `roles` y `actions`; `when.npcRole` y `when.action` deben pertenecer a esas listas.

`outcome` contiene exactamente `kind`, `data`, `steps` y `triggers`. `kind` es un identificador estable, `data` es un mapa declarativo, `steps` es una lista de mapas con un `op` identificable y cada disparador contiene `event` y `steps`. Los valores solo pueden ser escalares de texto, listas y mapas dentro de límites de profundidad y cantidad. `optionalEnding`, cuando existe, contiene exactamente `id`, `availability`, `numericThreshold`, `confirmationRequired`, `effect` y `note`; `effect` es un mapa declarativo con `type` y no se ejecuta durante la validación.

Esta etapa valida esas formas generales. No dispone todavía de un catálogo normativo de operaciones, condiciones, eventos ni parámetros; por tanto no demuestra que un `op`, sus argumentos o sus referencias mecánicas sean ejecutables o semánticamente correctos. Esa validación estricta pertenece a la etapa siguiente.

### 6.2 `gameplay.yaml`

El documento contiene exactamente `characterCreation` y `tableBindings`.

- `characterCreation.nameSelection` usa `mode: choice` y una lista de opciones con `id`, `tableId` y `labelKey`.
- Cada `tableId` de selección de nombres resuelve una tabla declarada.
- Cada `labelKey` resuelve un texto real de los catálogos generales para todos los idiomas del mundo.
- `tableBindings` es un mapa no vacío de grupos y nombres de binding. Cada valor resuelve una tabla declarada y un mismo nombre no se repite dentro de su grupo.

El validador comprueba enlaces y forma; no ejecuta creación de personaje ni interpreta el significado mecánico de un binding.

### 6.3 Catálogos localizados

Cada archivo declarado se analiza con el mismo subconjunto YAML seguro.

Un catálogo de tabla se reconoce por su campo explícito `tableId`, no por su nombre de archivo. Contiene `tableId`, `title` y opcionalmente `help`, `entries` y `optionalEndings`. El `tableId` resuelve una tabla única; las claves de `entries` resuelven entradas de esa tabla y las de `optionalEndings` resuelven el final opcional declarado. Cada idioma debe aportar exactamente un catálogo para cada tabla.

Los catálogos generales contienen árboles de claves y textos. Sus hojas son cadenas no vacías y no pueden colisionar entre archivos del mismo idioma. Las claves usadas por `gameplay.characterCreation.nameSelection` deben existir en todos los idiomas declarados.

## 7. YAML seguro y datos no confiables

Todos los YAML usan un único documento YAML 1.2 y el esquema `failsafe`; los escalares se interpretan como cadenas. Se rechazan claves duplicadas o no escalares, documentos múltiples, anclas, alias, etiquetas explícitas, merge y campos desconocidos en los niveles cuyo esquema está definido.

Las áreas declarativas de operaciones y traducciones admiten claves de datos, no extensiones de esquema. Se limitan profundidad, cantidad de nodos, longitud de claves y textos. No se crean funciones, fechas, expresiones ni clases y nunca se interpreta prosa como reglas.

## 8. Seguridad y límites ZIP

El validador comprueba el directorio central, transmite cada archivo sin extraerlo, impone el tamaño observado y verifica CRC-32.

| Recurso | Límite |
| --- | ---: |
| Archivo `.fateworld` comprimido | 32 MiB |
| Entradas ZIP, incluidos directorios | 256 |
| Archivo individual descomprimido | 8 MiB |
| Total descomprimido | 64 MiB |
| Relación por entrada | 100:1 |
| Profundidad de ruta | 8 segmentos |
| Longitud de ruta | 240 caracteres |
| Longitud de segmento | 80 caracteres |
| Tablas | 128 |
| Entradas de tabla | 4096 |

Se rechazan enlaces simbólicos, dispositivos, sockets, tipos Unix especiales y reparse points de Windows. El validador no sigue enlaces, no accede a la red, no ejecuta scripts y no modifica SQLite.

## 9. Resultado y catálogo

`validateFateworldPackage(packagePath)` devuelve una unión discriminada:

- éxito: perfil, identidad, versión, títulos, idiomas, compatibilidad, rutas declaradas, tablas normalizadas y resumen del archivo;
- fallo: uno o más errores con código estable, mensaje comprensible y, cuando corresponde, ruta interna.

El resultado no incluye la ruta absoluta del usuario, trazas, cabeceras ZIP crudas ni excepciones internas. Los códigos distinguen ZIP inválido, rutas inseguras, colisiones, límites, YAML no admitido, manifiesto o motor incompatibles, recursos ausentes, IDs duplicados, referencias rotas, gameplay, localización e imágenes inválidas.

El catálogo reutiliza este resultado. Un paquete Basic estructuralmente válido puede aparecer como **Paquete disponible**, pero continúa sin estar instalado: no activa Ronin, no sustituye imágenes integradas y no habilita Personajes, Crónicas ni ninguna acción de juego. Los slots gestionados mantienen los requisitos existentes de `owner`, paquete único y `ready` vacío.

## 10. Compatibilidad y evolución

La v1 es un contrato cerrado en desarrollo. El perfil narrativo se conserva íntegramente y Basic se selecciona solo mediante campos explícitos. Un lector no adivina perfiles ni ignora datos que no comprenda.

Una ampliación compatible puede añadir en una tarea aprobada nuevos valores versionados que un lector detecte y rechace de forma segura. Una ruptura del significado de campos existentes, de las reglas de identidad o de las garantías de seguridad requerirá una estrategia explícita de versión y migración; nunca se migrarán mundos o partidas de forma implícita.

## 11. Muestra y fuente de Ronin

Las fuentes de **Ecos de la marea** están en `examples/fateworld/echoes-of-the-tide/` y su paquete reproducible en `examples/fateworld/echoes-of-the-tide-1.0.0.fateworld`. Sigue siendo una muestra narrativa original, válida y no jugable.

`.fatebound-dev/ronin-source/ronin-fuentes.zip` es una fuente de trabajo de solo lectura, no un `.fateworld` instalable ni un fixture del repositorio. Declara Basic 1.0.0, 26 tablas, un gameplay, 27 catálogos españoles y 39 imágenes. Sus recursos protegidos no se copian al repositorio público ni se incorporan a un artefacto distribuible por el hecho de superar una validación estructural.

## 12. Trabajo pendiente

Permanecen fuera de esta etapa:

- validación estricta de cada operación, condición, evento, parámetro y referencia mecánica Basic;
- ejecución del motor, dados, combate, generación de personajes y progreso;
- vista previa e instalación inmutable bajo `data/worlds/`;
- esquema SQLite de mundos, personajes y Crónicas;
- extracción, renderizado de imágenes externas y asociación de emblemas a clanes;
- firmas, procedencia, dependencias entre paquetes, actualización y desinstalación;
- editor y exportación de mundos;
- recuperación conjunta de SQLite y versiones instaladas.

La distribución pública sigue siendo válida sin mundos y no incorpora contenido protegido de terceros. Una importación personal o una variante privada autorizada debe conservar las mismas validaciones; una contraseña u ofuscación no sustituye permisos de licencia.

# Formato técnico `.fateworld` v1

Estado del documento: especificación normativa del formato v1 y del validador implementado; importación e instalación pendientes.

Última actualización: 2026-10-12.

## 1. Alcance y términos normativos

Un archivo `.fateworld` v1 es un ZIP declarativo autocontenido que describe la identidad versionada de un mundo, sus idiomas reales, contenido narrativo Markdown y un conjunto mínimo de tablas YAML enlazadas. No contiene estado de juego ni código ejecutable.

Las palabras **DEBE**, **NO DEBE**, **PUEDE** y **SE RECHAZA** expresan requisitos de interoperabilidad del v1. El validador implementado en `src/main/worlds/` aplica este contrato sin extraer el paquete, instalarlo, modificar SQLite ni cargar recursos remotos.

Este hito define e implementa:

- la estructura cerrada del ZIP v1;
- el manifiesto, los idiomas y las referencias internas;
- un esquema mínimo de tablas narrativas con identificadores estables;
- validación de archivo, rutas, tamaños, YAML, imágenes y referencias;
- resultados tipados reutilizables por un futuro importador;
- la muestra técnica original **Ecos de la marea**.

No implementa importación persistente, instalación, biblioteca de mundos, IPC, interfaz, editor, esquema SQLite de juego, personajes, Crónicas ni motor de reglas. Superar el validador significa que el paquete cumple este contrato de datos; no significa que sea jugable.

## 2. Contenedor y estructura

El archivo DEBE usar la extensión `.fateworld`, sin que esa extensión sustituya la inspección real del ZIP. El contenedor DEBE ser un ZIP válido, de un solo disco y sin cifrado. Solo se admiten entradas almacenadas sin compresión o comprimidas con Deflate.

La raíz lógica v1 es:

```text
world.fateworld
  manifest.yaml                            obligatorio, exactamente uno
  content/<idioma>/*.md                   una descripción declarada por idioma
  data/*.yaml                             exactamente el archivo de tablas declarado
  assets/images/**/*.{png,jpg,jpeg,webp} opcional, solo archivos declarados
```

Las entradas explícitas de directorio son opcionales. Si existen, deben estar vacías, usar un tipo de directorio ordinario y ser antecesoras de al menos un archivo del paquete. Todos los archivos regulares deben estar declarados por `manifest.yaml`; el v1 rechaza archivos adicionales, aunque su extensión sea admitida.

No se admiten JavaScript, TypeScript, HTML, CSS, SVG, ejecutables, bibliotecas, fuentes, consultas SQL, módulos, plugins ni archivos de configuración capaces de ampliar privilegios.

## 3. Convenciones de rutas internas

Todas las rutas del ZIP y del manifiesto:

- son relativas a la raíz del paquete y usan `/`;
- están normalizadas como Unicode NFC;
- no comienzan ni terminan en `/` cuando identifican un archivo;
- no contienen `\`, unidades Windows, segmentos vacíos, `.` o `..`;
- no contienen controles ni los caracteres Windows `< > : " | ? *`;
- no usan segmentos terminados en punto o espacio ni nombres reservados como `CON`, `PRN`, `AUX`, `NUL`, `COM1` o `LPT1`, también cuando llevan extensión;
- tienen como máximo 240 caracteres, ocho segmentos y 80 caracteres por segmento.

La comparación para detectar colisiones Windows usa la ruta NFC en minúsculas. Por ello `data/Tables.yaml` y `data/tables.yaml` colisionan y se rechazan. También se rechazan entradas duplicadas y cualquier caso en que un archivo sea utilizado a la vez como directorio.

Las rutas declaradas se resuelven únicamente dentro del índice del ZIP. El validador no concatena esas rutas con una carpeta de destino ni crea archivos en disco.

## 4. `manifest.yaml`

`manifest.yaml` DEBE estar en la raíz y contener exactamente los campos siguientes. Los campos desconocidos se rechazan.

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
compatibility:
  requiredCapabilities: []
content:
  descriptions:
    es: content/es/description.md
data:
  tables: data/tables.yaml
resources:
  images: []
```

### 4.1 Identidad y versiones

- `formatVersion` DEBE ser la cadena `'1'`. Es la versión del contrato del paquete y es independiente de la versión del mundo.
- `world.id` es la identidad estable del mundo. Usa minúsculas, empieza por una letra, tiene entre 1 y 100 caracteres y contiene al menos un separador `.` o `-`; cada componente admite letras ASCII minúsculas y números.
- `world.version` DEBE ser una versión semántica completa `mayor.menor.parche`, con sufijos prerelease o build opcionales.
- Una publicación identificada por la pareja `world.id` + `world.version` debe tratarse como inmutable. Una modificación publicada requiere otra versión del mundo.
- `world.titles` contiene exactamente un título no vacío, de hasta 120 caracteres, para cada idioma declarado.

`world.id` y `world.version` no superan 100 caracteres. Cada etiqueta de idioma no supera 35 caracteres.

El validador no consulta otras versiones ni instala el paquete. La coexistencia, procedencia, firmas, actualización y publicación inmutable serán responsabilidades del futuro importador y almacén de mundos.

### 4.2 Idiomas

`world.languages` DEBE contener entre uno y dieciséis identificadores BCP 47 canónicos y no duplicados, por ejemplo `es`, `en-GB` o `ko`. `world.defaultLanguage` DEBE pertenecer a esa lista.

El v1 exige una traducción real para cada idioma declarado en:

- `world.titles`;
- `content.descriptions`;
- `titles` de cada tabla;
- `texts` de cada entrada.

Esos mapas no pueden omitir idiomas ni añadir otros. Fatebound no inventa traducciones y un mundo no está obligado a ofrecer los idiomas de la interfaz de la aplicación.

Cada `content.descriptions.<idioma>` apunta a un `.md` bajo `content/<idioma>/`. El Markdown DEBE ser UTF-8 válido y no puede contener NUL, HTML incrustado ni destinos remotos escritos como enlaces Markdown. El validador no renderiza el documento ni accede a la red. Cualquier renderer futuro deberá seguir sanitizando el Markdown como contenido no confiable.

### 4.3 Compatibilidad mecánica

`compatibility.requiredCapabilities` es la declaración separada de capacidades mecánicas que necesitaría el mundo. En v1 la lista DEBE estar vacía porque todavía no existe un motor funcional ni un catálogo aprobado de capacidades.

El validador rechaza cualquier capacidad declarada con `UNSUPPORTED_CAPABILITY`. Esta política evita aceptar un paquete que parezca compatible con dados Yin/Yang, atributos, técnicas, combate, bloqueos, efectos o consecuencias cuando esas mecánicas aún no están especificadas ni implementadas.

La futura evolución Ronin-compatible, ampliada y especializada deberá definir capacidades aditivas en una tarea dedicada. No forma parte del esquema de tablas narrativas de este v1.

### 4.4 Referencias de contenido, datos e imágenes

- `content.descriptions` declara exactamente un Markdown por idioma.
- `data.tables` declara un único YAML bajo `data/`.
- `resources.images` declara hasta 256 rutas únicas, en minúsculas, bajo `assets/images/`, con extensión `.png`, `.jpg`, `.jpeg` o `.webp`; el límite global de entradas reduce en la práctica ese máximo al contar también manifiesto, textos y datos.

Todos los archivos declarados deben existir con la misma ruta y todos los archivos regulares del ZIP deben estar declarados. Las imágenes se validan por su firma binaria PNG, JPEG o WebP además de la extensión. El v1 todavía no define dimensiones, tema visual ni uso semántico de imágenes; por ello la muestra mínima no necesita incluir una.

## 5. Subconjunto YAML seguro

Todos los YAML DEBEN usar un único documento YAML 1.2 y el esquema `failsafe`. En este subconjunto los escalares se interpretan como cadenas; mapas y secuencias son las únicas colecciones admitidas.

Se rechazan:

- claves duplicadas o no escalares;
- múltiples documentos;
- anclas y alias;
- etiquetas explícitas, incluidas etiquetas estándar adicionales o personalizadas;
- claves merge y construcciones YAML 1.1;
- campos desconocidos por el esquema Fatebound correspondiente.

El analizador no crea funciones, fechas, expresiones, clases ni otros tipos ejecutables. Los límites del ZIP y de los esquemas se aplican además del tamaño del propio YAML.

## 6. Tablas narrativas

El archivo indicado por `data.tables` contiene exactamente una clave `tables`:

```yaml
tables:
  - id: horizons
    titles:
      es: Horizontes
    entries:
      - id: silent-lighthouse
        texts:
          es: Un faro sin llama dibuja una ruta sobre el agua.
        references:
          - tableId: omens
            entryId: glass-bell
  - id: omens
    titles:
      es: Presagios
    entries:
      - id: glass-bell
        texts:
          es: Una campana suena bajo la superficie.
        references: []
```

Cada tabla:

- tiene un `id` estable y único en el paquete;
- tiene `titles` para exactamente los idiomas declarados, con hasta 160 caracteres por título;
- contiene al menos una entrada.

Cada entrada:

- tiene un `id` estable y único dentro de su tabla;
- tiene `texts` para exactamente los idiomas declarados, con hasta 4000 caracteres por texto;
- tiene una lista `references`, que puede estar vacía.

Los identificadores de tabla y entrada comienzan por una letra minúscula, admiten letras ASCII minúsculas, números, `.`, `_` y `-`, y no superan 80 caracteres. No representan un número ni una posición visible. Reordenar una tabla o una entrada no cambia su identidad.

Una referencia contiene `tableId` y, opcionalmente, `entryId`. `tableId` debe resolver una tabla única; si existe `entryId`, debe resolver una entrada única de esa tabla. Dentro de una entrada no puede repetirse la misma referencia. Identificadores duplicados y destinos ausentes se rechazan antes de devolver un paquete válido.

El paquete puede definir, reorganizar u omitir las tablas que necesite. El v1 no exige las tablas de Ronin ni fija resultados de dados, atributos, técnicas o combate. Sus límites estructurales son 128 tablas, 4096 entradas totales y 8192 referencias totales.

## 7. Seguridad y límites ZIP

El validador comprueba el directorio central y las cabeceras necesarias del ZIP, transmite cada archivo sin extraerlo, verifica el tamaño descomprimido observado y compara su CRC-32 con el declarado.

Límites normativos v1:

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

Antes de leer datos se rechazan tamaños no seguros, cifrado, métodos distintos de Stored o Deflate y relaciones de compresión superiores a 100:1. Durante la lectura se vuelve a imponer el límite por archivo. Esto reduce el riesgo de ZIP bombs sin presentar los límites como una defensa absoluta frente a todo consumo adversarial.

Se rechazan enlaces simbólicos, dispositivos, sockets y otros tipos Unix especiales, así como entradas marcadas como reparse points de Windows. El validador no sigue enlaces, no ejecuta scripts, no evalúa expresiones, no interpreta prosa como reglas y no modifica SQLite.

## 8. Resultado del validador

`validateFateworldPackage(packagePath)` devuelve una unión discriminada:

- éxito: identidad, versión, títulos, idiomas, rutas declaradas, tablas normalizadas y resumen del archivo;
- fallo: uno o más errores con código estable, mensaje comprensible y, cuando corresponde, ruta interna del paquete.

El resultado nunca incluye la ruta absoluta proporcionada por el usuario, trazas, cabeceras ZIP crudas ni excepciones internas. La implementación actual devuelve el primer fallo determinista encontrado; el tipo permite ampliar la acumulación de errores sin cambiar el consumidor.

Los códigos distinguen, entre otros, ZIP inválido, ruta insegura, colisión Windows, entrada peligrosa, límite excedido, YAML no admitido, manifiesto incompatible, capacidad desconocida, recurso ausente, identificador duplicado y referencia rota.

## 9. Compatibilidad y evolución

El v1 es un contrato cerrado: se rechazan campos, ubicaciones, tipos y capacidades desconocidos. Un consumidor que solo implemente v1 no intentará adivinar el significado de una versión futura.

Requerirán una nueva `formatVersion`:

- cambiar campos obligatorios o su significado;
- admitir nuevas clases de archivo o ubicaciones;
- ampliar el esquema de tablas de forma que un lector v1 no pueda conservarlo;
- introducir un catálogo de capacidades mecánicas;
- cambiar las reglas de identidad, referencias, idiomas o seguridad;
- relajar una condición cuyo desconocimiento pueda hacer que un lector v1 acepte incorrectamente un paquete.

Las futuras versiones deben detectar explícitamente el formato, conservar compatibilidad cuando sea posible y nunca migrar mundos o partidas de forma implícita. La versión del mundo seguirá separada de la versión del formato y de las capacidades del motor.

## 10. Muestra técnica original

Las fuentes de **Ecos de la marea** están en `examples/fateworld/echoes-of-the-tide/`. El paquete generado se entrega como:

```text
examples/fateworld/echoes-of-the-tide-1.0.0.fateworld
```

Se reconstruye de forma determinista con:

```bash
npm run build:example-world
```

El script usa API estándar de Node, orden estable de rutas, entradas Stored y una fecha ZIP fija. La muestra declara solo español, incluye una descripción original y dos tablas pequeñas con referencias válidas. No contiene material de Ronin o terceros, capacidades mecánicas, estado SQLite ni recursos gráficos innecesarios.

Es una muestra técnica: no se instala, no aparece en las ocho tarjetas **Próximamente** y no constituye un noveno mundo jugable.

## 11. Trabajo pendiente

Permanecen fuera del v1 implementado:

- importación, vista previa, instalación transaccional y almacenamiento inmutable bajo `data/worlds/`;
- IPC, selectores de archivos e interfaz de biblioteca;
- temas declarativos, dimensiones de imagen y más clases de recursos;
- firmas, procedencia, checksums globales y dependencias entre paquetes;
- coexistencia, actualización, desinstalación y recuperación conjunta con SQLite;
- editor y exportación de mundos;
- dados Yin/Yang, atributos, técnicas, combate y cualquier otra capacidad del motor;
- personajes, Crónicas, progreso y eventos persistidos.

La distribución pública sigue siendo válida sin mundos instalados y no incorpora contenido protegido de terceros. Las futuras importaciones personales o variantes privadas autorizadas deberán pasar por límites y validaciones equivalentes sin usar ocultación o contraseñas como sustituto de permisos de licencia.

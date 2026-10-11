# Dirección del formato de mundos

Estado del documento: dirección de producto y requisitos aprobados; especificación técnica pendiente.

Última actualización: 2026-10-10.

Este documento registra qué debe permitir un paquete de mundo de Fatebound sin convertir todavía las ideas de estructura, nombres de archivos o esquemas en un estándar cerrado. El importador, el editor, el esquema del juego y el motor de reglas aún no están implementados.

## 1. Objetivo

Un mundo debe poder instalarse, validarse, versionarse, utilizarse y exportarse como una unidad independiente. Su paquete reunirá contenido narrativo, datos mecánicos declarativos y recursos visuales sin contener código ejecutable.

La dirección aprobada es:

- distribuir mundos mediante paquetes ZIP instalables;
- proponer la extensión `.fateworld`, pendiente de confirmar al definir el contrato técnico;
- combinar contenido Markdown, datos estructurados YAML, imágenes, recursos visuales y temas declarativos;
- permitir que varios mundos y varias versiones de un mismo mundo coexistan;
- conservar la vinculación de personajes y campañas con la versión exacta usada al crearlos;
- permitir en el futuro editar datos desde Fatebound y exportar de nuevo un paquete completo;
- preparar inicialmente los paquetes mediante herramientas y procesos propios, sin exigir un editor visual avanzado en la primera versión.

La extensión no constituye por sí sola una frontera de seguridad. El importador tratará cada paquete como un ZIP no confiable, con independencia de su nombre.

## 2. Contenido previsto

Un paquete podrá incluir las siguientes clases de contenido:

- **manifiesto y metadatos:** identidad estable, versión del mundo, versión del formato, compatibilidad mecánica y referencias internas;
- **Markdown:** ambientación, instrucciones, descripciones y otros textos destinados a personas;
- **YAML estructurado:** tablas, técnicas, efectos conocidos, parámetros, condiciones, relaciones y datos traducibles;
- **recursos visuales:** ilustraciones, fondos, símbolos, texturas e imágenes referenciadas mediante rutas relativas;
- **tema declarativo:** valores visuales y selección de recursos dentro de las capacidades que Fatebound admita explícitamente;
- **traducciones:** textos o catálogos localizados cuando el contrato definitivo los contemple.

Markdown y YAML son datos. No podrán declarar scripts, consultas SQL, módulos, plugins, expresiones evaluables ni instrucciones en lenguaje natural que Fatebound ejecute como reglas.

### 2.1 Ejemplo conceptual, no normativo

Una futura especificación podría organizar un paquete de forma parecida a esta:

```text
mundo.fateworld
  manifiesto.yaml
  contenido/
  datos/
  idiomas/
  tema/
  recursos/
```

Los nombres, directorios y archivos de este ejemplo son ilustrativos. No deben usarse todavía como contrato de compatibilidad ni como base para paquetes públicos.

## 3. Identidad, versiones y coexistencia

Cada mundo necesitará una identidad estable independiente de su nombre visible. Cada publicación tendrá además una versión propia e inmutable. Editar una versión publicada producirá un borrador o una versión derivada; nunca modificará silenciosamente la publicación original.

La instalación deberá:

- distinguir la identidad del mundo, la versión del mundo y la versión del formato del paquete;
- evitar colisiones entre mundos distintos y entre versiones;
- instalar recursos bajo rutas administradas por Fatebound, sin depender de la ruta del equipo de origen;
- registrar de forma idempotente una versión ya instalada;
- permitir que una campaña antigua siga resolviendo exactamente su mundo y versión aunque existan publicaciones posteriores;
- rechazar o poner en espera paquetes cuya compatibilidad no pueda determinarse con seguridad.

Los nombres definitivos de campos, la sintaxis de versiones y la política ante dependencias entre paquetes quedan pendientes.

## 4. Compatibilidad mecánica

La versión del formato de paquete y el nivel de capacidades del motor son conceptos distintos. La especificación futura deberá poder declarar ambos sin suponer que actualizar uno obliga a reescribir el otro.

### Fase 1 — Mundos compatibles con Ronin

Los mundos comparten las mecánicas fundamentales de Ronin y pueden cambiar mediante datos la ambientación, los nombres, las tablas, las técnicas, las imágenes y la presentación. Ronin, Templario y Shaolin son ejemplos de los perfiles previstos.

### Fase 2 — Mundos Ronin ampliados

El motor añade capacidades mecánicas compatibles con las existentes. Robot y Soldado son ejemplos de perfiles que podrían usarlas. Los paquetes de la fase 1 deben continuar funcionando sin modificaciones obligatorias.

### Fase 3 — Mundos avanzados

El motor admite subsistemas más especializados, en especial de combate. Naves espaciales es el ejemplo de referencia, con sistemas, escudos y armamento. La ampliación debe conservar la ejecución de los mundos y partidas anteriores.

Las tres fases son hoja de ruta, no funcionalidad disponible. Antes de ampliar el motor deberán definirse capacidades versionadas, valores por defecto compatibles, pruebas con mundos anteriores y, cuando sea imprescindible transformar datos persistidos, una migración explícita y protegida mediante las garantías SQLite existentes.

## 5. Instalación y validación

El flujo previsto, todavía no implementado, es:

1. seleccionar el paquete sin ejecutarlo;
2. copiarlo o abrirlo en un área temporal controlada;
3. inspeccionar el ZIP y aplicar límites antes de extraer;
4. validar manifiesto, versión, estructura, rutas, tamaños y tipos admitidos;
5. analizar YAML con un esquema seguro y Markdown como contenido no confiable;
6. comprobar referencias internas y recursos visuales;
7. mostrar una vista previa, incompatibilidades y errores comprensibles;
8. publicar la versión completa de forma transaccional o no instalar nada;
9. conservar el paquete o los recursos instalados bajo la raíz portable administrada.

La validación deberá impedir, como mínimo:

- rutas absolutas, `..`, escapes de directorio y nombres ambiguos;
- enlaces simbólicos, enlaces duros u otras redirecciones inseguras;
- archivos o expansión total que excedan límites configurados;
- formatos, extensiones o firmas de archivo no admitidos;
- YAML con tipos, etiquetas o construcciones ejecutables;
- HTML activo, JavaScript, CSS arbitrario y recursos remotos no autorizados;
- referencias a archivos ausentes o fuera del paquete;
- identificadores duplicados, versiones incoherentes y capacidades no soportadas.

Los límites concretos de tamaño, compresión, cantidad de archivos, formatos y dimensiones de imagen se fijarán junto al importador y deberán ser configurables o justificarse técnicamente.

## 6. Temas declarativos

Un tema podrá describir paletas, tipografía entre opciones controladas, ilustraciones, fondos, símbolos, texturas y parámetros visuales admitidos. La navegación, los estados interactivos, el contraste mínimo, el foco, los mensajes de error y las operaciones sensibles seguirán bajo control de Fatebound.

El paquete no aportará componentes Vue, JavaScript, CSS libre, fuentes remotas ni acceso a Electron. El contrato final deberá limitar los temas a tokens y espacios de recursos validados, incluir alternativas legibles y permitir reducir efectos visuales. La dirección de experiencia se desarrolla en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

`resources/builtin-themes/` no es un ejemplo de estructura `.fateworld` ni un almacén de mundos instalados. Contiene nueve temas de solo lectura integrados en la aplicación: la identidad base Fatebound y las atmósferas de ocho mundos futuros. Estos ocho se muestran como **Próximamente** mientras no exista un paquete jugable. **No instalado** solo será aplicable cuando haya un paquete real disponible y validable; entonces podrán diseñarse su instalación y activación sin reutilizar este catálogo como contrato implícito.

## 7. Edición y exportación futuras

Fatebound podrá editar datos de un mundo y exportar posteriormente un paquete completo, pero la primera interfaz no necesita un editor visual avanzado. El diseño deberá conservar información que Fatebound aún no modifique, evitar pérdidas en ciclos de importación y exportación y distinguir claramente:

- paquete original instalado e inmutable;
- borrador editable;
- nueva versión publicada;
- recursos compartidos o copiados;
- datos del mundo frente al estado de personajes y campañas.

La exportación no sobrescribirá silenciosamente el paquete de origen y deberá validar de nuevo el resultado antes de publicarlo.

## 8. Distribución y Ronin

La distribución pública de Fatebound debe funcionar sin mundos y no incluirá contenido de Ronin ni de terceros sin autorización. Una persona podrá instalar legítimamente su propio paquete para uso personal cuando disponga del contenido correspondiente. Una compilación privada con contenido preinstalado seguirá siendo un perfil separado, explícito y verificable.

Las plantillas, ejemplos y temas incluidos públicamente serán originales de Fatebound. Las direcciones visuales o mecánicas de un perfil no autorizan a copiar textos, tablas, reglas ni recursos protegidos.

## 9. Cuestiones pendientes

La especificación técnica deberá resolver antes de implementar el importador:

- confirmación de la extensión `.fateworld` y detección independiente de la extensión;
- nombre, campos obligatorios y versionado del manifiesto;
- relación entre versión de paquete, versión de mundo y capacidades del motor;
- esquema YAML, identificadores, referencias, traducciones y espacios de nombres;
- estructura física definitiva y reglas de preservación al reexportar;
- formatos visuales, dimensiones, presupuestos de memoria y límites antiabuso;
- contrato exacto de tokens y recursos de los temas;
- política de actualización, coexistencia, desinstalación y contenido protegido;
- diagnóstico y experiencia ante paquetes incompatibles o parcialmente dañados;
- necesidad futura de firmas, procedencia o sumas de comprobación del paquete.

Ninguna estructura ilustrativa de este documento debe considerarse estable hasta que una tarea específica defina, implemente y pruebe el importador.

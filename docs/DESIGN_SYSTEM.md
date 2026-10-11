# Dirección visual y sistema de diseño

Estado del documento: dirección de producto aprobada y primera shell implementada; los componentes, tokens y temas definitivos siguen sujetos a evaluación.

Última actualización: 2026-10-11.

Fatebound debe transmitir la sensación de estar jugando y registrando una aventura. Su lenguaje visual se define como **«RPG cinematográfico + diario de aventuras»**. No debe parecer un dashboard empresarial genérico, un explorador técnico de archivos ni un administrador de base de datos.

## 1. Objetivos de experiencia

- Crear una aplicación moderna, evocadora e inmersiva sin recargar la interfaz.
- Mantener una navegación sencilla y predecible entre mundos, personajes, crónicas y ajustes.
- Favorecer sesiones largas mediante texto legible, jerarquía clara y densidad controlada.
- Permitir que cada mundo tenga identidad propia sin perder la coherencia funcional de Fatebound.
- Mostrar con honestidad qué contenido es jugable, qué es una demostración visual y qué funcionalidad todavía no existe.
- Integrar el branding oficial de `resources/branding/fatebound/` cuando resulte apropiado, sin deformarlo ni multiplicar variantes innecesarias en una misma vista.

## 2. Principios

### 2.1 La aventura es el centro

La pantalla principal, las transiciones de contexto y las decisiones de composición deben presentar mundos e historias antes que estructuras técnicas. Versiones, rutas, diagnósticos y detalles de almacenamiento aparecerán solo donde ayuden a comprender o resolver una situación.

### 2.2 Atmósfera con contención

Fondos, ilustraciones, símbolos y texturas pueden construir ambiente, pero nunca competir con el texto ni ocultar acciones. Se evitarán paneles superpuestos en exceso, brillos constantes, ruido visual, transparencias que reduzcan contraste y decoraciones que parezcan controles.

### 2.3 Coherencia entre mundos

La arquitectura de navegación, los patrones interactivos, los estados de foco, las confirmaciones y la ubicación de acciones críticas serán compartidos. El tema de un mundo transforma la expresión visual, no las reglas básicas de uso.

### 2.4 Accesibilidad desde el inicio

Contraste, tamaño de texto, foco visible, uso mediante teclado, etiquetas comprensibles y estados que no dependan únicamente del color son requisitos, no una fase de pulido. La interfaz preparará una opción para reducir movimiento y evitará parpadeos o animaciones que dificulten leer.

### 2.5 Veracidad de producto

Una tarjeta de un mundo cuyo paquete jugable todavía no existe deberá indicar **Próximamente**. **No instalado** se reservará para un paquete ya disponible que el usuario aún no haya instalado. Los espacios reservados para personajes, crónicas o funciones futuras explicarán su estado y no ofrecerán botones que aparenten instalar, abrir, guardar o jugar cuando esos casos de uso no existen.

## 3. Shell compartida

La primera interfaz funcional deberá establecer una shell reutilizable con:

- identidad de Fatebound convertida íntegramente en acceso claro al inicio;
- navegación contextual consistente, limitada a Mundos cuando no haya un mundo jugable activo;
- selector visual de mundos;
- área de contenido adaptable al mundo activo;
- acceso futuro a Personajes y Crónicas únicamente bajo un contexto real de mundo instalado y versión;
- Ajustes y diagnóstico como acción global de cabecera;
- selector de idioma de aplicación integrado en Ajustes, con nombres nativos y estado activo inequívoco;
- exportación manual de backups integrada en Ajustes como operación explícita, sin convertir la pantalla en un explorador de archivos;
- mensajes de error y estados de carga comprensibles;
- comportamiento adecuado en la ventana de escritorio y en el portable de Windows.

La shell no debe codificar reglas particulares de Ronin ni presuponer un mundo instalado. Iniciar Fatebound sin mundos es un estado válido y muestra siempre la identidad neutral `fatebound`, nunca una ambientación elegida de forma implícita.

## 4. Capas visuales

### 4.1 Base de Fatebound

La base controla elementos que deben permanecer estables:

- estructura y jerarquía de navegación;
- espaciado, rejilla y adaptación de la ventana;
- patrones de botones, formularios, selección y confirmación;
- estados de foco, error, advertencia, éxito, carga y ausencia de datos;
- tamaños mínimos legibles y contraste;
- paneles de diagnóstico y operaciones sensibles;
- iconografía funcional y lenguaje de interacción.

### 4.2 Tema del mundo

Un tema podrá modificar mediante datos validados:

- paleta y acentos;
- ilustraciones y fondos;
- símbolos y motivos decorativos;
- texturas;
- tratamientos de superficie y borde;
- opciones tipográficas dentro de un catálogo o límites controlados;
- intensidad de ciertos efectos visuales.

Los temas procederán en el futuro de paquetes de mundo. Serán declarativos: no podrán incluir componentes Vue, JavaScript, CSS arbitrario, recursos remotos ni acceso a Electron. El contrato exacto de tokens se definirá junto al formato `.fateworld`.

### 4.3 Contenido narrativo

Textos, tablas, imágenes y estados de la aventura usan los componentes y tokens disponibles. El contenido no puede alterar la navegación, ocultar advertencias, redefinir controles críticos ni reducir las garantías de accesibilidad.

## 5. Fundamentos pendientes de concretar

La implementación deberá definir y probar, sin fijarlos todavía en este documento:

- escala tipográfica y longitudes cómodas de lectura;
- escala de espaciado, radios, bordes y elevación;
- colores semánticos independientes del tema;
- tamaños mínimos de objetivo y orden de tabulación;
- anchuras y alturas mínimas de ventana;
- comportamiento de paneles, diálogos y navegación en espacios reducidos;
- catálogo de iconos y reglas de acompañamiento con texto;
- presupuestos de peso y resolución para fondos e ilustraciones.

El contraste se comprobará sobre las combinaciones reales de tema, no únicamente sobre los tokens aislados. Las texturas deberán poder atenuarse o desaparecer detrás de bloques largos de lectura.

## 6. Movimiento y efectos

El movimiento debe explicar cambios de estado o aportar continuidad espacial. No se usarán animaciones largas para bloquear la navegación ni secuencias repetitivas que cansen durante una sesión.

Directrices iniciales:

- transiciones breves y cancelables;
- ausencia de movimiento permanente sin valor funcional;
- nada esencial comunicado solo mediante animación;
- respeto por la preferencia del sistema para reducir movimiento;
- opción futura de reducir efectos propios de temas;
- degradación correcta si una unidad portable o un equipo tiene recursos limitados.

## 7. Direcciones atmosféricas

Estas referencias orientan futuros temas; no son paletas, fuentes ni recursos definitivos:

| Perfil    | Dirección atmosférica                             |
| --------- | ------------------------------------------------- |
| Fatebound | Archivo celestial, piedra oscura y oro; neutral.  |
| Ronin     | Tinta, carmesí y bronce; Japón feudal.            |
| Templario | Piedra, carmesí y acero; juramentos y fortalezas. |
| Ninja     | Sombra, jade y luz lunar; sigilo.                 |
| Shaolin   | Tonos tierra, azafrán y amanecer.                 |
| Robot     | Metal, circuitos y cian.                          |
| Soldado   | Verde oliva, acero y lenguaje visual táctico.     |
| Naves     | Espacio, estrellas y tonos violetas.              |
| Mundoplato| Fantasía insólita, pergamino, cobre y humor.      |

Fatebound es la identidad neutral de la aplicación, no un mundo de la biblioteca. Los ocho perfiles restantes usan recursos originales integrados para anticipar una atmósfera; no acreditan que existan paquetes, reglas o mecánicas jugables.

## 8. Primera interfaz funcional

**Implementado:** la demo de electron-vite se ha sustituido por una interfaz real que permite validar el sistema visual y la arquitectura de procesos. El alcance actual es:

1. pantalla principal atractiva con branding y navegación;
2. selección visual de mundos o temas demostrativos;
3. cambio perceptible y coherente de tema en la shell y el contenido;
4. identificación explícita de demostraciones no jugables;
5. estructura futura de Personajes y Crónicas, oculta de la navegación mientras no haya un mundo jugable activo;
6. ajustes con selector de idioma, exportación manual y diagnóstico real de almacenamiento SQLite;
7. verificación visual y funcional en el portable de Windows.

El diagnóstico consulta únicamente los datos necesarios mediante un contrato IPC mínimo, tipado y de solo lectura. La exportación abre el selector nativo desde main y muestra estados localizados de trabajo, éxito, cancelación o error, sin entregar la ruta al renderer. Main conserva la autoridad sobre rutas y SQLite; el renderer no recibe la conexión, consultas SQL, acceso general a archivos ni detalles internos innecesarios.

El tema inicial es Fatebound neutral. No aparece como tarjeta de mundo: es la identidad base sin mundo activo. Ronin, Templario, Ninja, Shaolin, Robot, Soldado, Naves y Mundoplato forman las ocho tarjetas seleccionables, todas con estado **Próximamente**. **Volver a Fatebound** restablece explícitamente la base y la selección dura solo durante la sesión.

Las definiciones visuales proceden de nueve `theme.yaml` bajo `resources/builtin-themes/`, no de valores repetidos en los componentes. Sus textos traducibles están separados en el catálogo i18n y se enlazan por el identificador estable del tema. Cada tema dispone de `hero`, `card` y `emblem`: el hero domina Inicio bajo degradados de lectura; las ocho tarjetas de mundo conservan una composición vertical 3:4 y forman una cuadrícula 4×2 en anchuras amplias; el emblema protagoniza el panel de detalle sobre una superficie discreta sin otra ilustración detrás.

Quedan fuera de esta fase el editor de mundos, la importación completa, las campañas jugables, las reglas avanzadas y la restauración de copias.

## 9. Componentes iniciales

La primera shell implementa o representa ya estos patrones, sin considerar definitiva su API visual:

- marco de aplicación y navegación principal;
- encabezado o área de contexto del mundo;
- tarjeta de mundo con estado y versión visible cuando corresponda;
- distintivo de estado **Próximamente**;
- selector de tema;
- estado vacío narrativo;
- acciones primarias, secundarias y destructivas diferenciadas;
- panel de ajustes;
- selector de idioma mediante grupo de opciones accesible;
- panel de diagnóstico con estados normal, advertencia y error;
- notificaciones y diálogos accesibles;
- contenedor de lectura para contenido narrativo.

Cada componente se evaluará por claridad, teclado, foco, contraste, texto largo, escalado y comportamiento con efectos reducidos antes de considerarse estable.

## 10. Cuestiones pendientes

- Paletas, tipografías, iconografía y recursos definitivos de Fatebound.
- Esquema de tokens y límites exactos de los temas `.fateworld`.
- Persistencia de preferencias visuales y de reducción de efectos.
- Tamaño mínimo de ventana y estrategia de adaptación.
- Verificación manual de textos ingleses y coreanos en todos los tamaños y temas.
- Presentación independiente de los idiomas de contenido declarados por cada mundo.
- Presupuesto de memoria, resolución y compresión de imágenes.
- Alcance exacto del diagnóstico SQLite que resulte útil sin exponer información sensible.
- Pruebas manuales y automatizadas de accesibilidad visual e interacción por teclado.

Estas decisiones deberán tomarse con prototipos reales en la shell, sin convertir las direcciones atmosféricas en requisitos rígidos antes de comprobar legibilidad y uso prolongado.

## 11. Decisiones de la primera shell

La implementación inicial fija las siguientes decisiones revisables:

- barra lateral persistente en ventanas amplias y navegación inferior compacta en el ancho mínimo admitido;
- bloque completo de marca como acceso a Inicio, con fondo activo, hover y foco; navegar a Inicio conserva el tema seleccionado;
- menú contextual sin Inicio ni Ajustes: solo Mundos en el estado actual, y Personajes y Crónicas cuando exista un mundo instalado activo;
- botón de Ajustes con engranaje en la cabecera, estado activo y etiqueta accesible;
- tipografía del sistema para lectura y una serif local del sistema para titulares, sin descargar fuentes;
- fallbacks locales `Noto Sans KR`, `Malgun Gothic`, `Apple SD Gothic Neo`, `Noto Serif KR` y `Batang` para que el hangul conserve legibilidad sin descargar fuentes;
- logotipo horizontal de `resources/branding/fatebound/` como identidad oficial en la barra amplia y símbolo de la misma familia en variantes compactas, independientes de los emblemas temáticos;
- ilustraciones propias del catálogo integrado como protagonistas, con geometría abstracta secundaria y sin recursos originales restringidos del manual de Ronin;
- catálogo YAML validado con una allowlist de nueve temas integrados, Fatebound como base y ocho mundos futuros, esquema cerrado, rutas relativas seguras y recursos empaquetados mediante Vite;
- selección del tema limitada a la sesión, sin persistencia ni registros de mundos;
- foco visible, enlace para saltar al contenido, semántica de botones, mensajes `aria-live` y respeto de `prefers-reduced-motion`;
- diagnóstico solicitado al abrir Ajustes y actualizable por acción expresa, sin sondeo.
- selector de idioma en Ajustes con Español, English y 한국어, cambio inmediato y estado de persistencia anunciado mediante `aria-live`.
- exportación manual como acción independiente, deshabilitada mientras trabaja y con resultado anunciado mediante `aria-live`.

La interfaz está localizada en español, inglés y coreano. El idioma de la aplicación permanece independiente de los idiomas de contenido: cada futuro mundo declarará los disponibles y su predeterminado, y la interfaz no mostrará opciones ni traducciones que el paquete no aporte.

Antes de estabilizar el sistema visual es obligatorio revisar manualmente los nueve temas, el contraste sobre cada hero, el encuadre completo de las ocho tarjetas 3:4 —incluido Mundoplato—, la cuadrícula 4×2, el panel de emblema, los tamaños 760×620 y 1180×780, la lectura prolongada, la navegación completa por teclado, los fallbacks, la reducción de movimiento, la claridad del nuevo logo y del engranaje como controles, los estados y textos de exportación en los tres idiomas y el equilibrio entre inmersión y ruido decorativo. Las pruebas técnicas no sustituyen esta revisión. El catálogo actual demuestra el enfoque, pero no define todavía el contrato futuro de temas `.fateworld`.

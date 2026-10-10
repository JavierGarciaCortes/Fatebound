# Dirección visual y sistema de diseño

Estado del documento: dirección de producto aprobada; componentes, tokens y temas definitivos pendientes de implementación.

Última actualización: 2026-10-10.

Fatebound debe transmitir la sensación de estar jugando y registrando una aventura. Su lenguaje visual se define como **«RPG cinematográfico + diario de aventuras»**. No debe parecer un dashboard empresarial genérico, un explorador técnico de archivos ni un administrador de base de datos.

## 1. Objetivos de experiencia

- Crear una aplicación moderna, evocadora e inmersiva sin recargar la interfaz.
- Mantener una navegación sencilla y predecible entre mundos, personajes, partidas y ajustes.
- Favorecer sesiones largas mediante texto legible, jerarquía clara y densidad controlada.
- Permitir que cada mundo tenga identidad propia sin perder la coherencia funcional de Fatebound.
- Mostrar con honestidad qué contenido es jugable, qué es una demostración visual y qué funcionalidad todavía no existe.
- Integrar el branding actual de `resources/branding/` cuando resulte apropiado, sin deformarlo ni sustituirlo silenciosamente.

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

Una tarjeta de mundo ficticio o un personaje de ejemplo deberá indicar **Demostración visual** o una etiqueta equivalente. Los espacios reservados para personajes, partidas o funciones futuras explicarán su estado y no ofrecerán botones que aparenten guardar o jugar cuando esos casos de uso no existen.

## 3. Shell compartida

La primera interfaz funcional deberá establecer una shell reutilizable con:

- identidad de Fatebound y acceso claro al inicio;
- navegación principal consistente;
- selector visual de mundos;
- área de contenido adaptable al mundo activo;
- acceso a personajes y partidas con estados vacíos honestos;
- ajustes y diagnóstico;
- mensajes de error y estados de carga comprensibles;
- comportamiento adecuado en la ventana de escritorio y en el portable de Windows.

La shell no debe codificar reglas particulares de Ronin ni presuponer un mundo instalado. Iniciar Fatebound sin mundos seguirá siendo un estado válido.

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

| Perfil  | Dirección atmosférica                                      |
| ------- | ----------------------------------------------------------- |
| Ronin   | Tinta, carmesí y bronce; Japón feudal.                      |
| Paladín | Azul profundo, piedra y oro.                                |
| Shaolin | Pergamino, templos y tonos tierra.                          |
| Robot   | Metal, circuitos y cian.                                    |
| Naves   | Espacio, estrellas y tonos violetas.                        |
| Soldado | Verde oliva, acero y lenguaje visual táctico.                |

Los temas demostrativos de la primera interfaz podrán inspirarse en estos perfiles usando recursos ficticios u originales. No exigirán mundos completos ni acreditarán que sus mecánicas estén implementadas.

## 8. Primera interfaz funcional

La siguiente fase de desarrollo debe sustituir la demo de electron-vite por una interfaz real que permita validar el sistema visual y la arquitectura de procesos. El alcance aprobado es:

1. pantalla principal atractiva con branding y navegación;
2. selección visual de mundos o temas demostrativos;
3. cambio perceptible y coherente de tema en la shell y el contenido;
4. identificación explícita de demostraciones no jugables;
5. secciones de personajes y partidas preparadas para el futuro, con estados vacíos veraces;
6. ajustes con un diagnóstico real de almacenamiento SQLite;
7. verificación visual y funcional en el portable de Windows.

El diagnóstico consultará únicamente los datos necesarios mediante un contrato IPC mínimo, tipado y de solo lectura. Main conserva la autoridad sobre rutas y SQLite; el renderer no recibe la conexión, consultas SQL, acceso general a archivos ni detalles internos innecesarios.

Quedan fuera de esta fase el editor de mundos, la importación completa, las campañas jugables, las reglas avanzadas y la restauración de copias.

## 9. Componentes iniciales a explorar

Sin cerrar todavía su API ni su aspecto, la primera shell probablemente necesitará:

- marco de aplicación y navegación principal;
- encabezado o área de contexto del mundo;
- tarjeta de mundo con estado y versión visible cuando corresponda;
- distintivo de demostración;
- selector de tema;
- estado vacío narrativo;
- acciones primarias, secundarias y destructivas diferenciadas;
- panel de ajustes;
- panel de diagnóstico con estados normal, advertencia y error;
- notificaciones y diálogos accesibles;
- contenedor de lectura para contenido narrativo.

Cada componente se evaluará por claridad, teclado, foco, contraste, texto largo, escalado y comportamiento con efectos reducidos antes de considerarse estable.

## 10. Cuestiones pendientes

- Paletas, tipografías, iconografía y recursos definitivos de Fatebound.
- Esquema de tokens y límites exactos de los temas `.fateworld`.
- Persistencia de preferencias visuales y de reducción de efectos.
- Tamaño mínimo de ventana y estrategia de adaptación.
- Idiomas iniciales y efecto de textos más largos en la composición.
- Presupuesto de memoria, resolución y compresión de imágenes.
- Alcance exacto del diagnóstico SQLite que resulte útil sin exponer información sensible.
- Pruebas manuales y automatizadas de accesibilidad visual e interacción por teclado.

Estas decisiones deberán tomarse con prototipos reales en la shell, sin convertir las direcciones atmosféricas en requisitos rígidos antes de comprobar legibilidad y uso prolongado.

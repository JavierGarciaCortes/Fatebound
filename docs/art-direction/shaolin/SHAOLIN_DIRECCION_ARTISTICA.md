# FATEBOUND 2.0 — SHAOLIN
## Dirección artística oficial · Guía autónoma para ilustraciones

**Documento:** `SHAOLIN_DIRECCION_ARTISTICA.md`\
**Mundo / tema:** Shaolin · **ID existente:** `shaolin`\
**Lema oficial:** «Disciplina, camino y compasión»\
**Dirección artística:** **APROBADA COMO CONCEPTO GENERAL** — pintura china tradicional reinterpretada, pigmentos minerales cálidos, influencias de mural antiguo y paisajismo *shanshui*, con formas ilustradas y movimiento fluido\
**Versión de esta guía:** 1.0 · 17 de octubre de 2026\
**Alcance:** identidad artística general, reglas de estilo y procedimiento para un chat independiente. **No se han diseñado ni aprobado todavía las composiciones finales de `hero`, `card` o `emblem`.**

> **PARA UN CHAT NUEVO:** Lee todo este Markdown y examina la ficha visual adjunta **`SHAOLIN_FICHA_VISUAL.png`** antes de proponer imágenes. El Markdown fija los principios artísticos, la paleta oficial y el método de trabajo; la ficha enseña la interpretación visual que buscamos. **NO generes ninguna ilustración oficial sin presentar antes una propuesta concreta y recibir la aprobación del usuario.** No cambies temas, YAML, identificadores, carpetas ni arquitectura del proyecto.

---

## 01. Estado, propósito y fuentes de referencia

Esta guía documenta **cómo deben dibujarse las ilustraciones de Shaolin** para Fatebound 2.0, aplicación de escritorio de aventuras narrativas en solitario con identidad general de **«RPG cinematográfico + diario de aventuras»**. Debe ser suficiente para abrir otro chat dedicado exclusivamente a este mundo, sin reconstruir conversaciones anteriores.

**Fuentes por orden de autoridad:**

1. **Instrucciones expresas y aprobaciones posteriores del usuario** para una ilustración o cambio concreto.
2. **Este Markdown**, que define estilo, intención, colores, continuidad y procedimiento.
3. **`resources/theme-previews/shaolin/theme.yaml`**, fuente de los colores oficiales y de los metadatos del tema. Sus valores se reproducen en la sección 04 sin alterarlos.
4. **`SHAOLIN_FICHA_VISUAL.png`**, lámina ilustrada de dirección artística de Shaolin, que debe adjuntarse al nuevo chat junto con este documento. Enseña un monje con bastón, arquitectura china, montañas, texturas y paleta; **no es un `hero` final**.
5. **Imágenes individuales que el usuario apruebe en ese chat**. Una vez aprobado un protagonista y un `hero`, sus rasgos pasan a ser la referencia principal para la `card`, y ambos deben orientar el `emblem`.

**Ficha visual existente:** `SHAOLIN_FICHA_VISUAL.png` es una copia con nombre normalizado de la ficha ilustrada producida en el chat de dirección artística (1672 × 941 píxeles). La imagen muestra una escena demostrativa, no una composición obligatoria para todos los encargos.

**Regla para discrepancias:** si algún rótulo, color aproximado, detalle histórico o forma de la ficha difiere de los valores oficiales o de una instrucción nueva aprobada, prevalecen **el YAML y el texto de esta guía**, salvo cambio expreso del usuario. Una ficha generada puede contener simplificaciones o detalles tipográficos imperfectos; los textos de la ficha **no deben copiarse a ilustraciones de juego**.

No se requiere implementar ni modificar el repositorio. Este archivo sirve para dirección artística y, solo cuando se solicite, preparar las exportaciones gráficas.

## 02. Identidad narrativa y emoción central

**Idea rectora:** *Shaolin es el camino de quien transforma el entrenamiento diario en equilibrio interior, y encuentra en la naturaleza tanto un maestro como un desafío.*

El mundo gira alrededor de **disciplina, camino y compasión**. Las artes marciales están presentes, pero no reducen el universo a combates o exhibiciones de fuerza: también cuentan el aprendizaje, el esfuerzo, el silencio, el viaje, la convivencia, la contemplación y la superación personal.

**Emociones buscadas:** serenidad activa, concentración, paciencia, determinación, humildad, perseverancia, armonía, respeto, vitalidad, asombro ante la montaña.

**Sensación visual:** una antigua pintura china cobra vida. Entre riscos, terrazas de piedra, patios monásticos y bosques de pinos, una figura de túnica naranja practica una forma marcial o contempla el paisaje. La escena puede ser dinámica, pero evita la agresividad espectacular y transmite **control del movimiento**.

**Frase guía para el ilustrador:** *La fuerza nace del equilibrio: un monje, un bastón y un sendero entre montañas antiguas.*

Shaolin es una **ambientación original inspirada en la cultura china** y no una reproducción documental de todos los aspectos de una época histórica concreta. Evitar mezclar sin cuidado convenciones visuales de otros países asiáticos.

## 03. Lenguaje artístico y grado de realismo

**Estilo aprobado:** **pintura tradicional china reinterpretada para arte narrativo contemporáneo**, combinando **murales antiguos de pigmentos minerales**, paisajismo *shanshui* y calidades de tinta/pincel sobre seda o papel.

**Orientación aproximada:** predominio de la pintura mineral mural, complementada por la profundidad atmosférica de la pintura de montañas y aguas. La referencia inicial fue aproximadamente **60 % mural y 40 % *shanshui***; es una guía de sensibilidad, no una receta mecánica.

Debe reconocerse por:

- **Pigmentos mates y cálidos**: ocre mineral, naranja arcilla, marrones, tonos pergamino y tinta terrosa.
- **Pincelada fluida, orgánica y deliberada**, visible en ropa, árboles, rocas, nubes y gestos de movimiento.
- **Figuras ilustradas y estilizadas**, con anatomía convincente pero sin modelado fotográfico de piel o músculos.
- **Contornos y planos suaves**: alternar líneas de pincel definidas con aguadas y transiciones de pigmento.
- **Montañas superpuestas**, roca evocada mediante ritmos de pincel, niebla amplia y espacios de respiración.
- **Textura artesanal de seda, pergamino o muro pintado**, con desgaste ligero y pigmentación irregular.
- **Composición cinematográfica en sentido narrativo**, pero con acabado claramente pictórico, no con realismo de cámara.

**No confundir con:** anime, pintura digital hiperrealista, fotografía, render 3D, ilustración vectorial excesivamente plana, fantasía mágica brillante o el *sumi-e* japonés de manchas negras bruscas que define a Ronin.

**Principio de acabado:** priorizar la lectura del gesto, la calma de la composición y la atmósfera. Los detalles se concentran en manos, postura, bastón, rostro, pliegues, piezas arquitectónicas importantes y ritmos de roca; el resto se resuelve con síntesis pictórica.

## 04. Paleta oficial del tema y jerarquía cromática

**Valores HEX exactos extraídos del `theme.yaml` original. No modificarlos.**

| Token del tema | HEX | Uso visual sugerido |
|---|---|---|
| `background` | `#211A16` | Tierra casi negra; sombras densas, árboles, marcos naturales |
| `surface` | `#32241C` | Marrón profundo; troncos, madera, zonas sombrías |
| `surfaceRaised` | `#453128` | Arcilla oscura; piedra, columnas, relieves y primeros planos |
| `primary` | `#D58147` | Naranja Shaolin; túnica, luz cálida y acento protagonista |
| `secondary` | `#C2A06C` | Ocre mineral; roca iluminada, pigmento mural y dorados mate |
| `text` | `#F3E6CF` | Pergamino claro; niebla cálida, zonas de luz, papel/seda |
| `textMuted` | `#C7B39A` | Arena/crema envejecida; planos medios y bruma suave |
| `border` | `#634838` | Tierra tostada; contornos, madera y separación entre planos |
| `success` | `#7FA17C` | Color funcional; no es necesario introducirlo en la ilustración |
| `warning` | `#DEA755` | Color funcional; no convertirlo en dorado brillante dominante |
| `danger` | `#C66D58` | Color funcional; no utilizarlo como identidad roja protagonista |

**Distribución artística orientativa:** marrones tierra y arcilla como anclaje; naranjas/ocres en personaje y acentos; pergamino, piedra clara y niebla para dar aire a la composición. **No imponer una proporción rígida**: una escena de montaña puede tener mucho marfil, y un patio interior más sombras terrosas. La ilustración admite matices y pigmentos intermedios sin sustituir los colores oficiales.

**Reglas cromáticas:**

- El **naranja mineral `#D58147`** debe sentirse artesanal, nunca fluorescente.
- El **ocre `#C2A06C`** debe parecer pigmento natural, no metal dorado pulido.
- El **pergamino `#F3E6CF`** puede iluminar fondos y nieblas, pero no debe convertirse en un blanco clínico.
- Priorizar armonía cálida, contraste legible y saturación contenida; pequeños verdes naturales o grises de roca son admisibles cuando la escena los necesite.
- Evitar rojos saturados dominantes (Ronin), azules nocturnos y jade frío dominantes (Ninja), y estética naranja/neón de efectos fantásticos.

La **paleta del YAML define la identidad**, no significa que cada píxel de una pintura deba coincidir exactamente con uno de sus HEX.

## 05. Iluminación, atmósfera y contraste

**Luz principal recomendada:** cálida, difusa y ligeramente polvorienta; mañanas en montaña, luz oblicua de tarde, claridad entre nieblas o patios iluminados naturalmente.

- La luz revela **planos pictóricos**, no poros ni superficies renderizadas.
- Niebla entre montañas, caminos y templos para separar distancias.
- Contraste mayor sobre silueta, rostro, manos, bastón o gesto que en fondos alejados.
- Sombras en marrón, ocre y tinta diluida; evitar negros empastados sin función visual.
- Puede haber una lámpara o farol discreto en escenas interiores; no depender siempre de fuegos y contraluces heroicos.
- El clima puede variar (bruma, viento, lluvia tenue, claridad tranquila), pero debe mantenerse la sensibilidad orgánica y contemplativa.

**Sensación emocional:** calma concentrada, esfuerzo con sentido, movimiento que nace del silencio. Incluso las escenas de acción deberían evitar un exceso de violencia gráfica o caos visual.

## 06. Texturas, materiales y tratamiento de superficies

**Textura unificadora:** pigmento mineral y tinta sobre superficies artesanales: seda, papel envejecido y muro mural ligeramente erosionado.

**Materiales recurrentes:**

- Túnicas de algodón/lino mate en naranja arcilla y crudo, con pliegues amplios.
- Bastones de madera, nudosos o pulidos por el uso, sin efectos mágicos.
- Suelo de losas antiguas, piedra de escalinatas, musgo y arena seca.
- Vigas, puertas y galerías de madera envejecida.
- Tejas y aleros de arquitectura china tradicional.
- Pinos retorcidos, bambú, hojas secas y rocas de montaña.

**Tratamiento artístico:**

- Pinceladas de distinta carga de pigmento: zonas opacas, bordes secos y aguadas suaves.
- Roca descrita por manchas y líneas rítmicas, no por fotografía de piedra.
- Tejidos definidos por la dirección de los pliegues y la acción corporal.
- Madera con vetas sugeridas; evitar exceso de microtextura.
- En fondos, simplificar detalles progresivamente y permitir zonas de niebla o pergamino.

**Evitar:** brillos plásticos, metal cromado, material 3D, filtros de fotografía envejecida sobre un render realista o texturas mezcladas que parezcan un collage incoherente.

## 07. Protagonistas, vestuario, anatomía y equipamiento

**Arquetipo visual:** monje o practicante Shaolin viajero, concentrado y disciplinado, con una presencia física ágil pero sobria. La ficha muestra un monje adulto de cabeza rapada y bastón en una postura amplia: **es una referencia de estilo y lenguaje corporal, no un diseño de personaje definitivo aprobado**.

**Apariencia sugerida:**

- Cabeza rapada o cabello muy corto según el personaje acordado.
- Rasgos humanos estilizados, expresivos pero contenidos.
- Cuerpo entrenado; musculatura no hipertrofiada, proporciones creíbles.
- Manos, pies y postura con especial atención a equilibrio y apoyo.
- Ropas sencillas en naranja mineral, tierra y crema envejecido; faja, capas ligeras y calzado apropiado.

**Equipo y movimiento:**

- Bastón largo de madera como motivo recurrente útil, **no obligatorio en todas las escenas**.
- Formas de mano vacía, desplazamientos bajos, entrenamiento en patio, meditación y travesía de montaña.
- Ropajes y mangas que siguen el movimiento mediante **curvas de pincel**, sin convertirse en estelas mágicas.
- Acción plausible en su lógica corporal, aunque la ilustración sea estilizada.

**Continuidad futura:** cuando el usuario apruebe el protagonista del `hero`, fijar sus rasgos concretos (rostro, edad aparente, ropa, faja, colores, bastón, calzado, silueta) y reproducirlos en la `card` que deba representar a la misma persona. **No crear un monje diferente por accidente.**

**Evitar:** monjes caricaturescos, exotismo decorativo genérico, héroes de musculatura desmesurada, armas fantásticas, halos sobrenaturales, poses físicamente inverosímiles usadas solo para dar espectáculo.

## 08. Escenarios, arquitectura, paisaje y ambientación

**Paisaje base:** montañas chinas estilizadas, riscos de varios planos, nubes o nieblas que recorren los valles, árboles de pino de silueta orgánica, senderos y agua cuando convenga.

**Arquitectura característica:**

- Monasterios y templos chinos entre montañas.
- Patios de entrenamiento, galerías, escalinatas y puertas monumentales sobrias.
- Tejados de aleros curvados, vigas y columnas de madera, suelos de piedra.
- Pequeños santuarios, puentes y caminos de montaña si tienen función narrativa.

**Escenas posibles:** entrenamiento al amanecer, caminata entre precipicios, descanso junto a un pino, meditación en un patio, práctica colectiva, llegada a un monasterio envuelto en bruma, travesía de senderos rocosos.

**Tratamiento del espacio:**

- Organizar montañas como grandes planos de tinta/pigmento con niebla entre ellos.
- Dejar respirar el horizonte y los detalles arquitectónicos.
- Los edificios deben tener personalidad **china**, evitando copiar por error un torii japonés o castillos japoneses de Ronin/Ninja.
- No exigir que aparezcan monasterio, pinos y montañas en todas las imágenes. Elegir motivos acordes con la escena aprobada.

## 09. Composición, profundidad, escala y lectura

**Gramática compositiva:** curvas de movimiento y líneas de bastón contrastadas con diagonales de senderos, terrazas, escaleras y montañas; espacios negativos de niebla o papel; escalas monumentales con figuras humanas relativamente pequeñas en paisajes abiertos cuando convenga.

- El protagonista debe leerse por **postura y silueta**, incluso cuando la ropa tenga textura pictórica.
- Priorizar gestos legibles: brazos, manos, bastón y dirección de mirada.
- Separar planos mediante superposición de roca, arquitectura y bruma; no depender de un desenfoque fotográfico.
- Equilibrar zonas densas de pigmento con vacíos de pergamino.
- En imágenes de portada, dejar una región realmente cómoda para textos y botones; no llenar todos los huecos con ramas o caracteres.
- Variar el punto de vista según la historia: paisaje panorámico, patio simétrico, senda ascendente, escena lateral de movimiento o composición más íntima.
- Evitar elementos narrativos imprescindibles en los bordes donde puedan perderse al exportar.

**La ficha visual muestra un monje con bastón en una pose dinámica ante montañas y arquitectura.** Ese encuadre demuestra el estilo, pero **no impone** la pose o el fondo del `hero` oficial.

## 10. Motivos recurrentes y símbolos del mundo

**Motivos de identidad:** túnica naranja mineral, bastón de madera, montaña y niebla, pino retorcido, escalera monástica, pergamino/seda, líneas fluidas de pincel, piedra y arquitectura china.

**Lectura narrativa:**

- **Bastón:** práctica, autocontrol y utilidad, sin pretensiones fantásticas.
- **Montaña:** camino largo, perseverancia y perspectiva.
- **Escalinata:** entrenamiento, ascenso y repetición.
- **Pino y roca:** resistencia, tiempo y adaptación.
- **Curva del movimiento:** armonía entre técnica, respiración y cuerpo.
- **Pigmento naranja/ocre:** calidez humana, disciplina y tradición pictórica.

Estos elementos proporcionan vocabulario visual, **no una composición de emblema ya aprobada**. El símbolo definitivo deberá proponerse específicamente cuando llegue esa fase; no dar por hecho que será un bastón, una rueda, una montaña o una silueta completa.

## 11. Diferenciación respecto a los demás mundos

| Aspecto | Shaolin | No confundir con… |
|---|---|---|
| Técnica | Pintura china mineral, mural reinterpretado, paisajismo *shanshui*, tinta fluida | **Ronin:** pincelada japonesa de fuerte contraste y sol carmesí |
| Paleta | Marrones tierra, naranja arcilla, ocre, pergamino | **Ninja:** índigo nocturno, jade y luz de luna |
| Protagonista | Monje/practicante en entrenamiento, viaje o contemplación | **Ronin:** guerrero errante con katana; **Templario:** caballero con cruz roja |
| Escenarios | Monasterio chino, riscos, pinos, patios, escalinatas y niebla | **Ninja:** tejados de espionaje; **Templario:** fortalezas europeas |
| Dinamismo | Movimiento fluido y controlado, formas orgánicas | **Robot/Naves:** geometría o energía tecnológica |
| Emoción | Disciplina, compasión, equilibrio y descubrimiento interior | Acción heroica espectacular o fantasía mágica |

**Principio general Fatebound:** coherencia de calidad e intención narrativa entre mundos, **sin imponer una sola técnica pictórica a todos**.

## 12. Prohibiciones y errores de estilo que deben corregirse

**Revisar o rechazar una imagen de Shaolin si presenta:**

- Acabado fotográfico, hiperrealismo, CGI o modelado 3D evidente.
- Estética anime, caricatura o póster de película de acción moderno.
- Efectos de «energía chi» luminosa, rayos, halos mágicos, fuego sobrenatural o partículas exageradas.
- Naranjas saturados artificiales, neón, oro metálico brillante como color dominante.
- Gran disco rojo de Ronin, tinta japonesa agresiva como técnica dominante o luna fría de Ninja como código principal.
- Arquitectura claramente japonesa en lugar de china, o mezcla cultural descuidada.
- Monjes representados como superhéroes musculosos o figuras ridiculizadas.
- Exceso de decorados, ornamentación y pequeños detalles que resten claridad.
- Posturas mal resueltas, bastones que atraviesan manos, extremidades adicionales o anatomía confusa.
- Caligrafía china inventada, caracteres sueltos decorativos o símbolos religiosos sin contexto.
- Letras, títulos, sellos, marcas, marcos, menús o botones dibujados **dentro de un `hero`, `card` o `emblem`**.

**Excepción:** la **ficha de dirección artística** sí contiene textos, sellos decorativos y paneles explicativos. Ese diseño de presentación **no debe trasladarse automáticamente a las ilustraciones oficiales de la aplicación**.

## 13. Recursos gráficos y especificaciones técnicas

Estos tamaños son **objetivos de exportación**. Si la herramienta genera dimensiones diferentes, conservar el original de mayor calidad y adaptar sin deformación, evitando recortes destructivos.

| Recurso | Función | Tamaño objetivo | Reglas |
|---|---|---|---|
| `hero.webp` | Portada del mundo | **1920 × 1080 · 16:9** | Panorámica; reservar preferentemente el tercio izquierdo para interfaz; protagonista/foco centro-derecha; sin textos dibujados |
| `card.webp` | Tarjeta de selección | **768 × 1024 · 3:4** | Composición vertical específica; mismo protagonista o motivo aprobado del `hero`, no recorte automático si pierde fuerza |
| `emblem.png` | Símbolo del mundo | **1024 × 1024 · 1:1** | Canal alfa con transparencia real; silueta clara; reconocible a 48 × 48; motivo derivado del concepto del mundo |
| `background.webp` (opcional) | Fondo complementario | **1920 × 1080 · 16:9** | Solo si se solicita; seguir la misma identidad visual y dejar espacio útil para UI cuando corresponda |

**Reglas técnicas:**

- Conservar el **PNG original generado** (u otro original disponible) además de la exportación definitiva.
- Comprobar proporción y dimensiones reales; no declarar 1920 × 1080 sin verificar el archivo.
- Nunca estirar la imagen. Adaptar mediante escalado proporcional, recorte supervisado o ampliación de lienzo según convenga.
- No colocar detalles imprescindibles en extremos o zonas bajo overlays oscuros.
- El `emblem` debe ser realmente transparente; dibujar negro alrededor no equivale a canal alfa.
- Si la herramienta de imágenes no reproduce con precisión las mismas manos, rostro o vestuario, iterar con **edición de la imagen aprobada como referencia** y verificar continuidad antes de avanzar.
- No editar el repositorio ni modificar los temas desde el chat de ilustraciones.

**Estado de los recursos:** aún **no existe un `hero`, una `card` ni un emblema final aprobado** en este flujo. La imagen `SHAOLIN_FICHA_VISUAL.png` es una **ficha de referencia**, no debe entregarse como `hero`.

## 14. Procedimiento obligatorio de trabajo y aprobaciones

**Regla principal: propuesta visual concreta antes de cualquier generación oficial.**

1. **Leer** este Markdown y **examinar** la ficha `SHAOLIN_FICHA_VISUAL.png`; confirmar qué recurso específico se solicita.
2. **Presentar una propuesta artística concreta** antes de generar: idea narrativa, protagonista y equipo, escenario, perspectiva, composición, iluminación, colores, técnica y conexión con piezas previas.
3. **Esperar aprobación explícita del usuario.** Que la dirección general esté aprobada **no autoriza a inventar un `hero` definitivo sin consenso**.
4. Tras la aprobación, **generar exclusivamente la pieza acordada**.
5. **Solicitar valoración**. Si hay cambios, preferir **editar** la ilustración existente para conservar composición y rasgos, cuando sea viable.
6. Una vez aprobado el `hero`, usarlo como **referencia directa de continuidad** para la propuesta y generación de la `card`.
7. Una vez aprobada la `card`, proponer el `emblem` a partir de ambos recursos y de esta guía.
8. **No pasar** a la pieza siguiente ni a otro mundo sin la aprobación correspondiente, salvo nueva instrucción del usuario.

El estilo global puede aplicarse a múltiples escenas futuras sin repetir siempre la misma pose o un mismo monasterio. Cualquier **cambio de dirección artística** debe tratarse como decisión independiente y someterse a aprobación.

## 15. Instrucciones reutilizables para un nuevo chat

### Mensaje inicial sugerido (antes de generar)

> Vamos a crear ilustraciones del mundo Shaolin de Fatebound 2.0. Adjunto `SHAOLIN_DIRECCION_ARTISTICA.md` y `SHAOLIN_FICHA_VISUAL.png`. Lee ambos archivos como referencias oficiales de estilo; respeta la paleta exacta del `theme.yaml` sin modificarlo. Queremos pintura china de pigmentos minerales y paisajismo *shanshui*, con textura de mural/papel, paleta cálida, monjes y paisajes ilustrados, nunca fotografía ni 3D. Antes de crear cada `hero`, `card` o `emblem`, proponme una composición concreta y espera mi aprobación. Trabajaremos una imagen por vez y mantendremos la identidad del protagonista entre piezas.

### Núcleo de instrucción artística para futuras generaciones

> Ilustración original para el mundo **Shaolin** de Fatebound 2.0, en estilo de **pintura tradicional china reinterpretada**, con influencia de **murales de pigmentos minerales y paisajismo *shanshui***. Composición pictórica con montañas por capas, niebla cálida, arquitectura monástica china y formas orgánicas según la escena aprobada. Pinceladas fluidas, pigmentos mates, papel/seda envejecidos y detalle selectivo. Paleta base de tierra `#211A16`, marrones `#32241C` y `#453128`, naranja mineral `#D58147`, ocre `#C2A06C`, pergamino `#F3E6CF` y crema `#C7B39A`. Personajes humanos estilizados, postura marcial verosímil, telas en movimiento y atmósfera de disciplina, camino y compasión. Debe parecer **ilustración artística de RPG narrativo**, no fotografía, render 3D, anime ni espectáculo de magia. Respetar la composición y los personajes que el usuario haya aprobado. Sin texto ni elementos de interfaz en la imagen final.

**Uso correcto:** sumar al párrafo anterior la **descripción concreta que apruebe el usuario**. No convertir el monje con bastón de la ficha en requisito de todas las escenas.

### Corrección de desviación habitual

> Mantén el concepto, el encuadre y los elementos ya aprobados, pero reinterpreta el acabado para alejarlo del realismo: simplifica anatomía y superficies, transforma los materiales en pigmento mineral mate, usa pincelada fluida y superposición de montañas y nieblas propia del *shanshui*, reduce brillos digitales y refuerza la textura mural o de seda. No alteres la identidad del personaje.

## 16. Lista de comprobación de calidad antes de aprobar

**Identidad y estilo**

- [ ] La ilustración se reconoce como mundo Shaolin sin texto.
- [ ] Mantiene pintura china mural/mineral y paisajismo *shanshui* en vez de realismo.
- [ ] Las figuras y la arquitectura tienen un tratamiento pictórico coherente.
- [ ] Se perciben disciplina, viaje, entrenamiento, serenidad o compasión según la escena.

**Color y atmósfera**

- [ ] Se reconoce la familia cálida de tierra, naranja mineral, ocre y pergamino.
- [ ] El naranja es pigmento mate, no neón ni metal brillante.
- [ ] Existe profundidad por niebla, superposición y cambios de valor.
- [ ] El protagonista o foco se distingue con claridad.

**Continuidad, cultura y formato**

- [ ] La arquitectura y los motivos culturales responden al ámbito chino, sin préstamos japoneses involuntarios.
- [ ] Los movimientos y manos tienen anatomía inteligible.
- [ ] Los personajes conservan sus rasgos aprobados entre `hero` y `card`.
- [ ] El recurso sigue la proporción y el espacio útil para UI establecidos.
- [ ] No contiene letras, marcos ni interfaz dibujada.
- [ ] Si es emblema, tiene transparencia real y se lee a 48 × 48.

**Proceso**

- [ ] La escena concreta fue propuesta y aprobada antes de generar.
- [ ] No se ha avanzado a otra pieza sin aprobación.
- [ ] El archivo original está conservado; las conversiones no deforman ni recortan elementos esenciales.

## 17. Decisiones cerradas, aspectos abiertos y futuras revisiones

### Cerrado / aprobado

- Mundo: **Shaolin**; lema oficial: **«Disciplina, camino y compasión»**.
- `mood: earth`, `motif: mountain-temple` y paleta oficial definidos por su YAML.
- **Dirección artística general:** pintura china tradicional reinterpretada, influencia de mural de pigmentos minerales y paisajes *shanshui*, con formas ilustradas y **sin realismo fotográfico**.
- Predominio de marrones tierra, naranja mineral, ocre y pergamino; pincelada fluida y textura artesanal.
- Tono de disciplina, equilibrio, compasión y relación con la naturaleza.
- La ficha `SHAOLIN_FICHA_VISUAL.png` existe como **muestra creada para visualizar esta dirección**: monje con bastón, túnicas fluidas, monasterio, patios, caminos de piedra, riscos, pinos, niebla y materiales cálidos.
- Procedimiento de aprobación previa y continuidad entre recursos.

### Todavía abierto: NO dar por decidido

- Composición definitiva del `hero`.
- Protagonista definitivo (rostro, atuendo preciso, accesorios, pose y bastón, si procede).
- Composición definitiva de la `card`.
- Diseño, geometría y símbolo exactos del `emblem`.
- Posibles `background` y escenas ilustradas complementarias.
- Momento del día, estación, escenario particular y argumento visual de cada nueva ilustración.

**La ficha visual es una referencia de estilo, no una aprobación anticipada de esos diseños.**

---

**RESUMEN OPERATIVO:** *Shaolin = pintura china mineral y *shanshui*; tierra, naranja y ocre; monjes, bastón, arquitectura china, montañas, niebla y movimiento disciplinado. `SHAOLIN_FICHA_VISUAL.png` muestra la sensibilidad visual; este Markdown fija las reglas. Cada imagen oficial debe proponerse y aprobarse antes de generarse.*

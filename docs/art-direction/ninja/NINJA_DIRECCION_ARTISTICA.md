# FATEBOUND 2.0 — NINJA
## Dirección artística oficial · Guía autónoma para ilustraciones

**Documento:** `NINJA_DIRECCION_ARTISTICA.md`\
**Mundo / tema:** Ninja · **ID existente:** `ninja`\
**Lema oficial:** «Silencio, sombra y precisión»\
**Dirección artística:** **APROBADA** — grabado japonés nocturno contemporáneo, de formas planas y menor realismo\
**Versión de esta guía:** 1.1 · 17 de octubre de 2026\
**Alcance:** identidad artística general y procedimiento de generación; **las composiciones finales y los diseños concretos de `hero`, `card` y `emblem` todavía no están aprobados**.

> **PARA UN CHAT NUEVO:** Lee este documento completo y observa **`NINJA_FICHA_VISUAL.png`**, la ficha visual adjunta antes de proponer imágenes. Este archivo y la ficha son un conjunto de referencias: el Markdown fija las reglas y los HEX; la ficha muestra su interpretación visual. **No generes ninguna imagen hasta presentar una propuesta concreta de la pieza y recibir aprobación.** No rediseñes YAML, slugs, carpetas, arquitectura ni sistemas de temas.

---

## 01. Estado, propósito y fuentes de referencia

Esta guía define **cómo deben dibujarse las ilustraciones del mundo Ninja** de Fatebound 2.0, una aplicación de escritorio de aventuras narrativas en solitario cuya identidad global es **«RPG cinematográfico + diario de aventuras»**. Debe poder usarse en otro chat sin recuperar el historial de decisiones.

**Fuentes, por orden de autoridad:**

1. **Instrucciones y aprobaciones expresas posteriores del usuario** para una ilustración concreta.
2. **Este documento**, para estilo, identidad, criterios y proceso de producción.
3. **`resources/theme-previews/ninja/theme.yaml`**, fuente inalterable de los valores oficiales del tema; los HEX de la sección 04 se han contrastado con ese archivo.
4. **`NINJA_FICHA_VISUAL.png`**, la ficha visual adjunta, lámina titulada «NINJA — Dirección artística — Fatebound 2.0», realizada con el **nuevo estilo de grabado japonés nocturno**. Sirve para reconocer el acabado y la atmósfera, **no** para copiar de manera literal una composición.
5. **Imágenes individuales que el usuario vaya aprobando**: una vez aprobado el `hero`, debe usarse como referencia prioritaria de continuidad al crear la `card`; el emblema se apoyará en ambos y en la guía.

Si la ficha contiene pequeños textos, colores, ornamentos o detalles que contradicen el YAML o este documento, **prevalecen los valores verificados y las reglas escritas**. Las imágenes de una ficha explicativa son muestras de estilo, no elementos que haya que reproducir todos a la vez. No es necesario que el nuevo chat disponga de antiguos ejemplos descartados.

**No se pide implementar archivos en el repositorio, cambiar los temas o diseñar sistemas.** El trabajo de ese chat es exclusivamente artístico y, cuando se solicite, de preparación de archivos gráficos.

## 02. Identidad narrativa y emoción central

**Idea rectora:** *Ninja es el Japón feudal visto desde las sombras.* Una historia de observación, paciencia, infiltración y precisión; los peligros se intuyen antes de mostrarse. El protagonista conoce rutas que otros no ven y se mueve entre la ciudad dormida y la fortaleza vigilada.

**Emociones y conceptos prioritarios:** sigilo, concentración, tensión contenida, misterio, astucia, discreción, vigilancia, soledad, oportunidad, movimiento calculado.

**Sensación buscada:** el instante previo a una decisión arriesgada: un ninja inmóvil en un tejado, una luz detrás de una celosía, guardias lejanos, una muralla que parece infranqueable. **Puede haber acción**, pero la identidad del mundo no depende de combates espectaculares.

**Frase guía para el ilustrador:** *Una silueta en la oscuridad; una ciudad dormida; una misión que nadie debe descubrir.*

## 03. Lenguaje artístico y grado de realismo

**Estilo aprobado e irrenunciable:** **grabado japonés en madera (*mokuhanga*) nocturno, reinterpretado de forma contemporánea** para un RPG narrativo premium.

Debe reconocerse por:

- **Formas relativamente planas** y grandes masas de color: sombras oscuras, planos azules y bruma fría organizados como una estampa.
- **Profundidad por capas**, más que por renderizado tridimensional: tejados en primer plano, calles o patios intermedios, castillos y montañas diluidos al fondo.
- **Contornos precisos**, naturales, ligeramente irregulares cuando corresponde; las siluetas se leen antes que los detalles internos.
- **Pigmento impreso y papel texturado**, con grano fino y variaciones sutiles. Pueden percibirse leves imperfecciones propias de la estampación artesanal.
- **Nubes, árboles y niebla estilizados**, con ritmos gráficos japoneses; evitar nubes fotográficas y humo de efectos especiales.
- **Acabado artístico elaborado pero no hiperrealista**: elegante, atmosférico, con detalle selectivo y composición potente.

**No confundir con:** una pintura digital de acción realista, un render 3D, una fotografía, anime/manga, un vector geométrico sin textura ni un sumi-e de pinceladas libres. Ninja puede tener tinta y textura, pero su rasgo distintivo son **las masas planas y la impresión por capas**, no los brochazos violentos de Ronin.

**Principio de detalle:** primero la silueta y las relaciones tonales; después los tejados, ventanas, armas o telas; finalmente la textura. Si un detalle perjudica la lectura, se elimina.

## 04. Paleta oficial del tema y jerarquía cromática

**Valores exactos del YAML oficial. No cambiarlos.**

| Token del tema | HEX | Uso visual sugerido |
|---|---|---|
| `background` | `#111720` | Negro azulado; sombras máximas, cielo y siluetas |
| `surface` | `#1C2530` | Índigo nocturno; ropa, tejados próximos, arquitectura oscura |
| `surfaceRaised` | `#263540` | Pizarra azulada; planos medios de piedra, madera y relieve |
| `primary` | `#6DAF9F` | Jade frío; pequeños reflejos, niebla con matiz verdoso, foco secundario |
| `secondary` | `#718AA8` | Azul acero/niebla; cielo, planos distantes, luz lunar tenue |
| `text` | `#E4E9E6` | Marfil grisáceo; luna, brillos muy escogidos y alto contraste |
| `textMuted` | `#B0C2C7` | Gris bruma; transición atmosférica y superficies claras |
| `border` | `#374D59` | Pizarra profunda; límites de arquitectura y cambios de plano |
| `success` | `#73A890` | Color funcional: no necesita aparecer en imágenes |
| `warning` | `#D1A76A` | Color funcional: puede inspirar **mínimos** puntos cálidos de faroles |
| `danger` | `#CA6C6B` | Color funcional: **no usar como rojo identitario dominante** |

**Distribución orientativa, no fórmula obligatoria:** 70–80 % de fríos oscuros, 15–25 % de azules medios/grises claros, y una pequeña proporción de jade o luces selectivas. La luna y la niebla pueden requerir variaciones tonales de los colores oficiales; no se exige restringir la ilustración a ocho valores exactos.

**Reglas importantes:**

- Deben mandar el **negro humo**, el **índigo** y el **azul acero**.
- El **jade frío** es un distintivo elegante, **no un brillo neón**.
- El marfil grisáceo se reserva para contrastes legibles: luna, niebla o contornos luminosos.
- Puede haber algún farol ámbar o pequeños detalles otoñales, pero **nunca** convertir el mundo en una estampa roja/naranja.
- La ficha visual puede contener un sello rojo decorativo o una muestra puntual con hojas rojas: **no forman parte del código cromático principal de Ninja**.

## 05. Iluminación, atmósfera y contraste

La luz debe surgir de **fuentes contenidas y comprensibles**: luna, ventanas iluminadas, faroles aislados, reflejos de agua, una rendija en una puerta o luz lateral a través de la niebla.

- Predominio nocturno y de crepúsculo; posibilidad de lluvia o bruma.
- Luna fría como recurso recurrente **pero no obligatorio**.
- Sombras muy amplias con **focos localizados**, no iluminación uniforme.
- Bruma superpuesta entre planos; distancia sugerida por menor contraste y tonos más suaves.
- Ventanas pequeñas cálidas pueden hacer creíble una ciudad habitada sin dominar la paleta.
- El ninja debe distinguirse del tejado o la pared mediante un borde, contraste tonal o silueta; **la oscuridad nunca justifica que la imagen sea ilegible**.

Emoción: silencio, anticipación y un ligero peligro. Evitar rayos épicos, halos mágicos, fogonazos o reflejos metálicos excesivos.

## 06. Texturas, materiales y tratamiento de superficies

**Textura unificadora:** papel entintado / impresión en madera, visible de forma discreta en toda la pieza.

**Materiales habituales:** tejas de barro oscuras, madera desgastada, tablones y celosías, muros de piedra, ropa de tela mate, cuerdas, metal muy poco reflectante, musgo y superficies húmedas.

**Tratamiento gráfico:**

- Las tejas se definen por ritmos repetidos y algunos contornos, no por renderizar cada pieza individualmente.
- La madera se sugiere con vetas selectivas; la piedra, con bloques planos de valores separados.
- La ropa se resuelve con pocos planos de sombra y pliegues de sentido funcional.
- El acero puede tener un filo claro muy breve, sin cromados ni destellos fantásticos.
- La lluvia y la niebla se integran en las capas de impresión; no deben convertirse en un filtro fotográfico.

Las texturas pueden variar por escenario, pero todas deben pertenecer al mismo lenguaje de estampa japonesa, no a collage de materiales incompatibles.

## 07. Protagonistas, vestuario, anatomía y equipamiento

**Arquetipo visual:** infiltrador o explorador japonés de contexto feudal, de silueta ligera, equilibrada y controlada. No imponer un personaje concreto a todas las escenas **antes** de que el usuario apruebe su diseño oficial.

- Proporciones humanas verosímiles, sin musculatura de superhéroe.
- Posturas de observación, agazapado, desplazamiento silencioso, salto medido o espera.
- Vestimenta funcional en capas oscuras, tejidos mates, cinturón y calzado flexible; capucha o cobertura facial **si la composición lo requiere**.
- Mirada y lenguaje corporal concentrados; rostro puede estar oculto en sombra.
- Herramientas discretas y plausibles: una espada adecuada al personaje, cuerda, bolsa, utensilios de infiltración. Ninguna arma es obligatoria por defecto.
- Presencia gráfica dominante por **silueta**, no por armas enormes ni equipamiento ornamental.

La imagen no pretende ser una reconstrucción histórica documental: el ninja oscuro es una **convención artística deliberada**. Evitar, aun así, piezas anacrónicas llamativas o armas pseudo-futuristas.

**Continuidad obligatoria una vez aprobado el héroe de un conjunto:** conservar la misma figura cuando `card` y `hero` deban compartir protagonista: forma de capucha, ropajes, cinturón, longitud y posición del arma, proporciones, silueta y cualquier rasgo distintivo definido. La tarjeta no puede parecer otro ninja.

## 08. Escenarios, arquitectura, paisaje y ambientación

**Espacios adecuados:** tejados de ciudades y aldeas, castillos japoneses, murallas, torres de vigilancia, patios, callejones, corredores de madera, puertas, puentes, cursos de agua, bosques de bambú o pino y senderos de montaña.

**Diseño ambiental:**

- Edificios organizados en siluetas escalonadas; tejados con fuertes diagonales.
- Castillos o puertas pueden ser objetivos visuales que sugieran una misión.
- Las calles húmedas, las ventanas distantes y los faroles aislados aportan historia sin necesidad de representar multitudes.
- Pinos negros, montañas azuladas y nubes horizontales pueden organizar los bordes y los planos.
- Niebla, lluvia, viento en cintas o ramas y superficies mojadas aportan movimiento silencioso.

**No hacer obligatorios los mismos iconos ambientales:** no toda ilustración necesita una luna llena, castillo, puerta torii, bambú o ninja en un tejado. Elegir los motivos de acuerdo con la historia representada.

## 09. Composición, profundidad, escala y lectura

**Gramática compositiva:** masas oscuras de primer plano, plano medio narrativo y fondo más claro o brumoso; líneas de tejados, puentes y caminos como guías; contraste concentrado en el foco elegido.

- Priorizar la lectura inmediata de la silueta y del propósito de la escena.
- Aprovechar el espacio negativo en las escenas de sigilo: el vacío es parte de la tensión.
- Alternar vistas amplias con encuadres cercanos según el recurso solicitado, **sin repetir mecánicamente una composición**.
- No colocar detalles narrativos imprescindibles justo en extremos potencialmente recortables.
- Evitar fondos muy contrastados detrás de textos reales de interfaz.
- A 48–96 px debe seguir percibiéndose el elemento dominante de un símbolo; en imágenes grandes se admite mayor detalle atmosférico.

La ficha visual muestra una ciudad bajo la luna y un ninja en un tejado. Ese encuadre es un **ejemplo excelente de técnica y jerarquía visual**, no una plantilla obligatoria.

## 10. Motivos recurrentes y símbolos del mundo

**Motivos característicos:** luna fría o velada, sombras, tejados, siluetas en movimiento, castillos lejanos, nubes horizontales, niebla, líneas diagonales de infiltración, jade tenue, arquitectura japonesa recortada.

**Significado narrativo:**

- **Sombra:** ocultación y decisión.
- **Luna:** vigilancia, tiempo y visibilidad limitada.
- **Tejados y altura:** rutas secretas y superioridad de observación.
- **Fortaleza distante:** objetivo, peligro y desafío.
- **Niebla:** incertidumbre, profundidad y oportunidad.

Estos recursos no forman un emblema ya aprobado. Cuando se diseñe uno, deberá proponerse al usuario un símbolo concreto, claro y apto para tamaños pequeños.

## 11. Diferenciación respecto a los demás mundos

| Aspecto | Ninja | No confundir con… |
|---|---|---|
| Técnica | Grabado japonés por capas, geometría de sombras y texturas impresas | **Ronin:** tinta de pincel gestual y brochazos expresivos |
| Paleta | Índigo, negro azulado, acero, jade frío, luna gris marfil | **Ronin:** marfil dominante, negro y gran sol rojo |
| Narrativa | Espionaje, infiltración y observación | **Ronin:** viajero expuesto, honor y camino |
| Composición | Planos de tejados, diagonales, bruma, luz localizada | **Templario:** pintura histórica y fortaleza monumental |
| Materialidad | Papel estampado, tejas, madera, sombras mates | **Robot/Naves:** brillo tecnológico, metal pulido o luz espacial |

Compartir ambientación japonesa con Ronin **no** implica compartir técnica ni estética cromática.

## 12. Prohibiciones y errores de estilo que deben corregirse

**Rechazar o revisar una imagen si presenta:**

- Foto, hiperrealismo, CGI o render 3D evidente.
- Pinceladas sueltas dramáticas como técnica dominante, propias de Ronin.
- Gran disco solar carmesí, fondo marfil protagonista o rojo saturado general.
- Neón verde, azul eléctrico, cyberpunk, magia luminosa o partículas espectaculares.
- Anime, manga, caricatura, anatomía de superhéroe, poses acrobáticas absurdas.
- Demasiados microdetalles que destruyen la lectura a tamaño de interfaz.
- Mezcla de arquitectura medieval europea o tecnología ajena al mundo.
- Silueta del ninja empastada con el fondo sin contraste suficiente.
- Copia exacta de la ficha visual cuando se había pedido una escena nueva.
- Letras, caligrafía decorativa, logotipos, botones, marcos o elementos de UI dibujados dentro de las imágenes de juego.

**Excepción:** una ficha de dirección artística solicitada expresamente sí puede contener textos y paneles informativos; una imagen oficial de juego no.

## 13. Recursos gráficos y especificaciones técnicas

Los **formatos y dimensiones son objetivos de exportación**, no excusa para deformar un original. Si la herramienta genera otra resolución, conservar el original y adaptar sin distorsión en una fase posterior.

| Recurso | Destino | Proporción / tamaño | Condiciones esenciales |
|---|---|---|---|
| `hero.webp` | Portada del mundo | **16:9 · 1920 × 1080** | Escena panorámica; preferentemente tercio izquierdo limpio para textos y botones; foco principal centro-derecha; sin texto dibujado |
| `card.webp` | Selección de mundo | **3:4 · 768 × 1024** | Composición vertical propia; **mismo protagonista o motivo principal que el hero aprobado**; no limitarse a un recorte si perjudica la escena |
| `emblem.png` | Símbolo del mundo | **1:1 · 1024 × 1024** | **Fondo realmente transparente**; formas sencillas; legible a **48 × 48 px**; derivado del concepto compartido |
| `background.webp` (opcional) | Fondo adicional | **16:9 · 1920 × 1080** | Solo si se solicita; continuidad visual y espacio para UI cuando proceda |

**Reglas técnicas generales:**

- Conservar el **original generado de máxima calidad** (frecuentemente PNG), además del WebP/PNG definitivo.
- No estirar ni deformar; si el original no encaja, escalar proporcionalmente y recortar solo con cuidado de no perder partes esenciales, o adaptar el lienzo de forma no destructiva.
- El `emblem` debe tener transparencia real (canal alfa); un negro dibujado no equivale a transparencia.
- Evitar detalles esenciales en bordes; probar legibilidad con degradados oscuros de interfaz.
- No convertir ni entregar un archivo con dimensiones supuestamente exactas sin verificarlo cuando se solicite exportación final.
- No modificar el repositorio desde el chat artístico.

## 14. Procedimiento obligatorio de trabajo y aprobaciones

**Norma principal: propuesta primero, generación después de aprobación explícita.**

1. **Leer** este MD y examinar la ficha visual adjunta; comprobar qué recurso se pide y qué imágenes previas están realmente aprobadas.
2. **Presentar una propuesta visual concreta antes de generar:** concepto narrativo, figura principal y equipo si los hay, escenario, perspectiva, composición, atmósfera, luz, paleta, técnica y relación con recursos anteriores.
3. **Detenerse y esperar al usuario.** No generar una imagen porque «parezca claro» el concepto sin la aprobación solicitada.
4. Una vez aprobada la propuesta, **generar solo la pieza autorizada**.
5. **Pedir valoración**. Si hay correcciones, **editar la imagen existente** siempre que sea viable, en lugar de rediseñar un universo o un personaje desde cero.
6. Tras aprobarse el `hero`, preparar la propuesta de la `card` tomando ese hero como referencia visual directa. Mantener personaje y rasgos aprobados.
7. Tras aprobarse la `card`, proponer y generar el `emblem` apoyándose en el hero, la card y este documento.
8. **No avanzar** a otra pieza o mundo sin aprobación cuando el usuario haya establecido esa secuencia.

Las propuestas pueden ajustar una escena específica sin cambiar el estilo ya aprobado. **Si se pretende cambiar la dirección artística general, pedir autorización expresa.**

## 15. Instrucciones reutilizables para un nuevo chat

### Mensaje inicial sugerido (antes de generar)

> Vamos a crear ilustraciones del mundo Ninja de Fatebound 2.0. Usa `NINJA_DIRECCION_ARTISTICA.md` y `NINJA_FICHA_VISUAL.png` como referencias oficiales. Respeta la paleta `theme.yaml`, el estilo de grabado japonés nocturno contemporáneo, las formas planas, las siluetas legibles y el trabajo por capas. No rediseñes arquitectura ni YAML. Antes de dibujar cada recurso, proponme una composición específica y espera mi aprobación. Trabajaremos una imagen cada vez, conservando continuidad entre el hero, la card y el emblema.

### Núcleo de instrucción artística para futuras generaciones

> Ilustración original del mundo Ninja de Fatebound 2.0. Estilo **grabado japonés en madera nocturno contemporáneo (*mokuhanga*)**, con grandes masas de color plano, siluetas oscuras muy legibles, contornos refinados, pigmentos superpuestos y textura sutil de papel impreso. Japón feudal interpretado con arquitectura japonesa, sombras, tejados o entornos de infiltración según la escena aprobada. Profundidad por capas de niebla, azul pizarra y luces localizadas. Base cromática `#111720`, `#1C2530`, `#263540`; bruma azul `#718AA8`, jade frío `#6DAF9F` y luz marfil `#E4E9E6` con moderación. Atmósfera de silencio, misterio, observación y precisión. Acabado de estampa artística premium para RPG narrativo; **no fotografía, no 3D, no anime, no neón, no gran sol rojo**. Respetar la composición concreta ya aprobada y la identidad del personaje si existe referencia anterior. No introducir texto, símbolos tipográficos ni interfaz.

**Uso correcto:** el párrafo anterior define **el acabado constante**. Se le debe añadir la descripción aprobada de la **escena concreta**, no repetir automáticamente el ninja agazapado de la ficha.

### Corrección de desviación habitual

> Reinterpreta la misma escena con un tratamiento más gráfico y plano, propio de una estampa japonesa nocturna: reduce volúmenes realistas, separa mejor las capas de color, simplifica texturas, fortalece las siluetas y elimina iluminación cinematográfica fotográfica. Conserva la composición, personajes y elementos ya aprobados.

## 16. Lista de comprobación de calidad antes de aprobar

**Identidad y estilo**

- [ ] Se reconoce el mundo Ninja sin recurrir a texto.
- [ ] Predominan las formas planas y la textura de grabado japonés.
- [ ] No parece fotografía, 3D, anime ni pintura gestual de Ronin.
- [ ] La escena transmite sigilo, observación o precisión.

**Color y legibilidad**

- [ ] Respeta la gama fría oficial, con jade y luces controlados.
- [ ] Las siluetas principales se distinguen del fondo.
- [ ] La profundidad está organizada por planos de valor y niebla.
- [ ] No hay neón ni rojos/naranjas dominantes.

**Continuidad y formato**

- [ ] El protagonista o motivo aprobado mantiene sus rasgos entre piezas.
- [ ] La escena deja libre el espacio de interfaz pertinente al recurso.
- [ ] No aparecen textos, marcos ni botones dentro de la ilustración.
- [ ] No se han perdido elementos importantes por recortes o conversiones.
- [ ] En caso de emblema, transparencia real y reconocimiento a tamaño pequeño.

**Proceso**

- [ ] La composición concreta fue presentada y aprobada antes de generar.
- [ ] No se ha avanzado a una pieza posterior sin confirmación.
- [ ] Se ha conservado el archivo original de calidad máxima.

## 17. Decisiones cerradas, aspectos abiertos y futuras revisiones

### Cerrado / aprobado

- Mundo: **Ninja**; lema: **Silencio, sombra y precisión**.
- `mood: shadow` y `motif: moon-shadow`, definidos en su YAML.
- **Estilo aprobado: grabado japonés nocturno, formas más planas y menos realismo.**
- Paleta y HEX de la sección 04.
- **La ficha visual adjunta representa correctamente la dirección general**, en particular su escena nocturna con ninja en los tejados, luna, castillo en bruma, siluetas, arquitectura y textura impresa.
- Identidad separada de Ronin, Templario y de mundos tecnológicos.
- Trabajo con aprobación previa y continuidad entre piezas.

### Todavía abierto: NO dar por decidido

- Composición definitiva del `hero`.
- Diseño definitivo, detalles únicos y postura del ninja protagonista.
- Composición definitiva de la `card`.
- Diseño y símbolo exactos del `emblem`.
- Imágenes de fondo complementarias.
- Escenas narrativas específicas y variaciones de hora, estación o situación.

**No interpretar ejemplos de esta guía como una aprobación anticipada de esas decisiones.**

---

**RESUMEN OPERATIVO:** *Ninja = estampa japonesa nocturna, sombras azules por capas, siluetas precisas, jade frío y tensión silenciosa. `NINJA_FICHA_VISUAL.png` enseña el acabado; este Markdown fija sus reglas. Cada imagen oficial necesita una propuesta concreta y la aprobación del usuario antes de generarse.*

# FATEBOUND 2.0 — ROBOT
## Dirección artística oficial · Guía autónoma para ilustraciones

**Documento:** `ROBOT_DIRECCION_ARTISTICA.md`\
**Mundo / tema:** Robot · **ID existente:** `robot`\
**Lema oficial:** «Memoria, acero e identidad»\
**Dirección artística:** **APROBADA COMO CONCEPTO GENERAL** — anime mecha industrial ilustrado, con *cel shading*, dibujo mecánico preciso y fondos tecnológicos pictóricos, sin realismo fotográfico\
**Versión de esta guía:** 1.0 · 17 de octubre de 2026\
**Ficha visual asociada:** **`ROBOT_FICHA_VISUAL.png`**\
**Alcance:** identidad artística, paleta y método de trabajo. **Aún no están aprobados los diseños finales ni las composiciones de `hero`, `card` y `emblem`.**

> **PARA UN CHAT NUEVO:** Lee este Markdown entero y examina la ficha adjunta **`ROBOT_FICHA_VISUAL.png`**. Ambos archivos son referencias complementarias: este documento fija las reglas, los colores y el procedimiento; la ficha visual muestra la estética buscada. **No generes ninguna imagen oficial sin presentar previamente una propuesta artística concreta y recibir la aprobación del usuario.** No rediseñes YAML, slugs, carpetas, estructura ni sistemas del proyecto.

---

## 01. Estado, propósito y fuentes de referencia

Esta guía define **cómo deben dibujarse las ilustraciones del mundo Robot** de Fatebound 2.0, aplicación de escritorio para aventuras narrativas en solitario con identidad global **«RPG cinematográfico + diario de aventuras»**. Debe ser suficiente para iniciar otro chat exclusivamente dedicado a Robot, sin necesidad de recuperar conversaciones anteriores.

**Fuentes por orden de autoridad:**

1. **Indicaciones expresas y aprobaciones posteriores del usuario** para cada pieza o corrección.
2. **Este documento**, que establece el estilo, las reglas de continuidad, la paleta y el flujo de creación.
3. **`resources/theme-previews/robot/theme.yaml`**, origen oficial de los valores cromáticos y atributos ya definidos del tema. **No editarlo.**
4. **`ROBOT_FICHA_VISUAL.png`**, ficha ilustrada de referencia adjunta al nuevo chat. Presenta el robot errante, escenarios industriales, materiales, iluminación y muestras cromáticas. **No constituye un `hero` ni un personaje final aprobado.**
5. **Ilustraciones individuales aprobadas más adelante**: una vez confirmado el diseño del protagonista y aprobado el `hero`, estos pasan a ser referencias prioritarias de continuidad para la `card` y el `emblem`.

**Regla ante discrepancias:** las etiquetas o colores impresos en una ficha generada pueden ser imperfectos; prevalecen los valores HEX oficiales de la sección 04 y las decisiones expresas del usuario. La ficha describe **estilo**, no obliga a copiar una pose, una escala o cada elemento que contiene. Sus recuadros, marcos y textos son de presentación; **no deben aparecer en ilustraciones finales**.

No se pide implementar la app ni modificar su repositorio. El objetivo del futuro chat es proponer, producir, revisar y, cuando se solicite, exportar recursos gráficos.

---

## 02. Identidad narrativa y emoción central

**Idea rectora:** *Un robot autónomo, marcado por el desgaste y por recuerdos incompletos, atraviesa ciudades tecnológicas, instalaciones industriales y lugares olvidados buscando respuestas sobre su origen y su identidad.*

**Temas principales:** memoria, acero, identidad, autonomía, exploración, soledad, reparación, decisiones, tecnología, persistencia, descubrimiento y vínculos posibles con otros seres o máquinas.

**Emoción central:** la pequeña conciencia de un viajero ante un mundo mecánico inmenso; mezcla de asombro, melancolía tecnológica y determinación tranquila. Puede haber acción, peligro y enfrentamientos, pero **Robot no se reduce a una guerra de mechas**.

**No es un mundo exclusivamente arruinado:** además de fábricas y estaciones abandonadas, pueden existir ciudades en funcionamiento, zonas habitadas, centros de mantenimiento, talleres, transportes, comunidades robóticas e infraestructura automatizada activa. El tono melancólico no obliga a que todo esté destruido.

**Frase guía para el ilustrador:** *En una ciudad de acero más antigua que sus recuerdos, un viajero de metal busca quién es.*

---

## 03. Lenguaje artístico y grado de realismo

**Estilo aprobado:** **ilustración japonesa de ciencia ficción mecha industrial**, evocadora de anime dibujado a mano, reinterpretada con acabado moderno y profesional para un RPG narrativo.

**Referencias de sensibilidad, no diseños para copiar:**

- **Gundam:** contundencia de la anatomía mecánica, placas superpuestas, articulaciones y siluetas distinguibles.
- **Patlabor:** ingeniería plausible, maquinaria de uso cotidiano, juntas, uniones, reparaciones y sensación industrial funcional.
- **BLAME!:** megainfraestructuras, arquitectura abrumadora, corredores y ciudades laberínticas, aislamiento del explorador.

Estas obras **son influencias de lenguaje visual**, no licencias ni universos que se deban reproducir. **Inventar diseño original**: no copiar cabezas, cascos, antenas en V, combinaciones cromáticas icónicas, marcas, insignias ni siluetas reconocibles de franquicias existentes.

**Tratamiento gráfico característico:**

- *Cel shading* claro: sombras definidas por **planos de color**, no por gradientes fotográficos complejos.
- Dibujo técnico-artístico con **líneas precisas** y jerarquizadas; más detalle en juntas, paneles y focos narrativos, menos en fondos lejanos.
- Superficies industriales desgastadas, sugeridas mediante manchas y marcas **dibujadas**, no texturas fotográficas pegadas.
- Fondos pintados con profundidad atmosférica, líneas de construcción claras y escala arquitectónica poderosa.
- Anatomía robótica funcional: actuadores, bisagras, sensores, blindaje, cables protegidos y volumen legible.
- Sensación de **anime mecha ilustrado** y arte de videojuego, no de fotografía, CGI publicitario o render 3D.

**Grado de realismo:** diseño mecánico creíble, pero representación **claramente estilizada**. El realismo buscado es de función y peso, no de imagen de cámara.

**Principio de lectura:** primero silueta y grandes masas de grafito; después articulaciones y focos cian; al final daños, códigos de superficie y microdetalles. No saturar todos los planos de líneas técnicas.

---

## 04. Paleta oficial del tema y jerarquía cromática

**Colores HEX exactos extraídos del `resources/theme-previews/robot/theme.yaml`. No modificarlos.**

| Token del tema | HEX | Uso visual sugerido |
|---|---|---|
| `background` | `#10191F` | Negro grafito tecnológico; fondos y sombras profundas |
| `surface` | `#1A2830` | Acero oscuro; carcasas, estructuras y planos principales |
| `surfaceRaised` | `#263B44` | Azul pizarra industrial; arquitectura, blindajes y capas intermedias |
| `primary` | `#45C8D1` | **Cian tecnológico**; visor, núcleo de memoria, sensores y focos narrativos |
| `secondary` | `#84A5B2` | Azul acero claro; bruma industrial, reflejos y distancia |
| `text` | `#E5F0F0` | Marfil frío; luces y bordes claros escogidos |
| `textMuted` | `#A9C6CC` | Niebla técnica; luz difusa y transiciones atmosféricas |
| `border` | `#34535C` | Acero azulado medio; divisiones de paneles y límites constructivos |
| `success` | `#70B29B` | Color funcional de interfaz; no es un acento artístico obligatorio |
| `warning` | `#E2B56B` | Color funcional; puede inspirar señales cálidas **muy puntuales** |
| `danger` | `#DF7770` | Color funcional; no convertirlo en rojo identitario del mundo |

**Jerarquía orientativa:** 65–75 % de grafito y aceros oscuros, 15–25 % de grises azulados/claros, 5–10 % de cian y luz selectiva. **Son proporciones artísticas, no límites matemáticos**: una escena a plena luz podrá contener más niebla clara y una instalación subterránea más sombra.

**Normas:**

- El **cian `#45C8D1`** es la firma cromática, **no un baño neón** sobre toda la escena.
- El material base es grafito y acero envejecido, **no** un robot blanco-azul-rojo-amarillo de anime clásico.
- Se admiten matices propios del metal, niebla, corrosión leve, polvo y luces secundarias sin alterar la identidad central.
- Los colores `success`, `warning` y `danger` son tokens funcionales del tema y **no deben imponerse como grandes superficies de la ilustración**.
- La ficha visual es una muestra pictórica; si sus etiquetas cromáticas difieren de esta tabla, **esta tabla manda**.

---

## 05. Iluminación, atmósfera y contraste

**Luz principal:** técnica, fría y direccional. Fuentes reconocibles: luminarias de fábrica, ventanas altas, cielos brumosos, pantallas discretas, tubos de mantenimiento, focos de pasarela y sensores del robot.

- El **visor cian** y el **núcleo de memoria** pueden actuar como focos visuales secundarios, sin convertirse en magia.
- Contraste mayor en cabeza, torso y articulaciones importantes; menor en el fondo lejano.
- Niebla industrial, polvo y vapor ligero para separar capas de una ciudad monumental.
- Reflejos de acero limitados: evitar cromados, destellos publicitarios y exceso de iluminación azul eléctrico.
- La atmósfera puede variar: estaciones activas, factorías apagadas, lluvia urbana, corredores subterráneos o exteriores con cielo gris.
- Mantener zonas de respiración visual para superposición de interfaz en piezas que lo necesiten.

**Emoción:** aventura tecnológica y misterio, con un toque de soledad. Evitar tanto el espectáculo de explosiones constante como la oscuridad ilegible.

---

## 06. Texturas, materiales y tratamiento de superficies

**Materiales propios:** placas de acero y aleación mate, grafito, uniones mecánicas, vidrio técnico, pantallas, cableado integrado, juntas de goma, hormigón industrial, conductos, rejillas, pasarelas y señalética abstracta.

**Cómo dibujarlos:**

- Placas de blindaje definidas por contorno y variaciones de **dos o tres planos de tono**, no por reflejos 3D complejos.
- Desgaste localizado y lógico en bordes, uniones, rodillas, codos y reparaciones antiguas.
- Tornillos, remaches, bisagras, pistones y ranuras con **detalle selectivo**; no cubrir cada centímetro de elementos minúsculos.
- Cableado y circuitos como parte de la ingeniería; las líneas luminosas pueden recordar el motivo `circuit-lines` del tema, **sin llenar el dibujo de trazos cian**.
- Niebla o polvo integrados en el pintado de fondos, no filtros fotográficos.
- Contraste entre grandes estructuras de fábrica y pequeñas marcas de uso humano/robótico.

La ficha visual muestra material envejecido con cierta riqueza tonal; conservarlo en clave **dibujada y cel-shaded**, no convertirlo en un render hiperrealista.

---

## 07. Protagonistas, vestuario, anatomía y equipamiento

**Arquetipo aprobado a nivel conceptual:** un **robot humanoide autónomo y errante**, no un mecha gigante pilotado por humanos.

**Propuesta visual inicial, que deberá concretarse y aprobarse al crear las piezas oficiales:**

- Altura narrativa orientativa de **unos dos metros**, robusto sin ser colosal; ajustar solo si el usuario cambia el concepto.
- Anatomía mecánica humanoide: torso resistente, hombros angulares, antebrazos y piernas articulados.
- **Cabeza compacta y visor óptico cian**; evitar rostro humano fotográfico.
- **Núcleo luminoso cian en el pecho**, ligado narrativamente a memoria e identidad.
- **Placas de grafito y acero envejecido**, con reparaciones visibles y un hombro ligeramente distinto del otro; silueta asimétrica controlada.
- Accesorios funcionales según aventura: mochila compacta, herramientas, protección o capa de material técnico desgastado **solo si se aprueba en el diseño final**.
- Posturas contemplativas, de avance, exploración, observación o preparación; también puede combatir, pero no convertir todas las ilustraciones en póster de acción bélica.

**Advertencia esencial sobre la ficha visual:** la imagen central muestra al robot a una **escala visual aparentemente gigantesca** junto a edificios diminutos. Ese recurso sirve para expresar **monumentalidad y diseño mecánico**, pero **NO fija la escala canónica del protagonista**. Al diseñar ilustraciones definitivas, mantener coherencia con un robot viajero autónomo aproximadamente humanoide en un mundo de megainfraestructuras; el entorno puede ser colosal sin que el protagonista lo sea.

**Evitar:** antenas en V típicas de personajes Gundam, esquemas de color icónicos ajenos, logotipos reconocibles, proporciones de juguete, aspecto de soldado humano embutido en armadura o androide de piel humana hiperrealista.

---

## 08. Escenarios, arquitectura, paisaje y ambientación

**Universo visual:** ciudades tecnológicas verticales, factorías, complejos automatizados, estaciones y recorridos de exploración a través de infraestructura inmensa. El mundo debe sentirse **habitado por sistemas y procesos**, aunque algunas zonas estén vacías.

**Escenarios recurrentes:**

- Megaciudades con puentes elevados, niveles superpuestos y torres industriales.
- Fábricas, naves de montaje, líneas de ensamblaje y talleres de reparación.
- Corredores técnicos, túneles, ascensores, hangares y centros energéticos.
- Estaciones de transporte y pasarelas suspendidas.
- Ruinas de instalaciones tecnológicas y sectores desconectados.
- Distritos activos, talleres modestos, refugios de máquinas y zonas de convivencia mecánica.

**Arquitectura:** funcional, modular, repetitiva cuando corresponda, con estructuras de carga, vigas, paneles metálicos, conductos y huecos monumentales. El detalle arquitectónico debe establecer la **escala del mundo sin confundir la del robot**.

**Ambientes posibles:** niebla fría, lluvia fina, polvo industrial, cielos plomizos, luces escasas en espacios interiores, amanecer pálido entre torres.

**Evitar:** estaciones espaciales como estética dominante (reservadas a Naves), neones comerciales saturados de cyberpunk genérico, mundos únicamente apocalípticos, escenarios medievales o fantasía mágica, referencias reconocibles de propiedades ajenas.

---

## 09. Composición, profundidad, escala y lectura

**Principio:** un viajero mecánico reconocible frente a construcciones mayores que él; composición clara con tres escalas: detalle del robot, espacio transitable cercano e infraestructura lejana.

- Usar líneas de fuga de pasarelas, puentes y edificios para guiar la mirada.
- Conservar un centro de interés legible: visor, núcleo, silueta o una decisión narrativa concreta.
- Construir profundidad con **perspectiva dibujada**, capas industriales y atmósfera azul acero; no depender de desenfoque fotográfico.
- Alternar escenas íntimas de mantenimiento con grandes vistas de ciudad; **no todas las imágenes deben repetir el mismo robot monumental en la misma pose**.
- Organizar el detalle: arquitectura rica cerca del foco y simplificada en zonas destinadas a textos.
- Equilibrar masas verticales de torres, diagonales de puentes y luz cian selectiva.
- En composiciones narrativas, un personaje pequeño puede expresar aislamiento; **la perspectiva no debe convertirlo literalmente en un robot del tamaño de un edificio**.

La composición exacta de cada recurso se decide **después** de una propuesta y su aprobación, no queda predeterminada por la ficha ilustrada.

---

## 10. Motivos recurrentes y símbolos del mundo

**Motivos visuales fundamentales:**

- Visor óptico cian.
- Núcleo o memoria lumínica en el pecho.
- Placas de blindaje de grafito con reparaciones visibles.
- Uniones mecánicas dibujadas con precisión.
- Líneas de circuito y conexiones entre sistemas.
- Arquitectura vertical, puentes, torres y factorías.
- Talleres, terminales, puertas técnicas e infraestructura de tránsito.

**Significado narrativo posible:** el visor simboliza percepción; el núcleo, recuerdos e identidad; las reparaciones, historia vivida; los caminos entre megaestructuras, exploración y decisiones.

**No fijar todavía el `emblem` oficial.** Podrá derivarse del núcleo, una geometría óptica o un motivo de circuito que el usuario apruebe al diseñar esa pieza. Evitar iconos robóticos genéricos sin relación con la figura aprobada.

---

## 11. Diferenciación respecto a los demás mundos

Robot debe tener un lenguaje propio dentro de Fatebound:

| Mundo | Identidad ilustrativa | Diferencia respecto a Robot |
|---|---|---|
| **Ronin** | *Sumi-e* japonés expresivo, sol rojo, papel marfil | Robot usa delineado técnico y cian, no pinceladas caligráficas ni sol rojo |
| **Templario** | Miniatura medieval y grabado europeo, cruz roja, piedra | Robot usa aleaciones, módulos, circuitos y arquitectura industrial |
| **Ninja** | Grabado japonés nocturno de formas planas, luna, índigo y jade | Robot comparte fríos pero incorpora construcción mecha, cian energético y entornos tecnológicos |
| **Shaolin** | Mural chino y paisajismo *shanshui*, pigmentos terrosos, movimiento fluido | Robot prioriza planos mecánicos angulares y acero, no tinta orgánica cálida |
| **Soldado** | Ambientación militar independiente, por definir | Robot no debe convertirse en humano táctico ni guerra militar realista |
| **Naves** | Exploración espacial independiente, por definir | Robot transcurre principalmente entre máquinas e instalaciones, no dominado por naves y cosmos |

**Equilibrio de marca:** todas las imágenes siguen la idea «RPG cinematográfico + diario de aventuras», pero cada mundo utiliza una tradición gráfica diferente. **Robot será el mundo de anime mecha industrial**, no una plantilla de ciencia ficción reutilizada para cualquier tema.

---

## 12. Prohibiciones y errores de estilo que deben corregirse

**No aceptar sin revisión** imágenes que presenten alguno de estos problemas:

- Aspecto fotográfico, hiperrealista o de CGI/Unreal Engine.
- Copia reconocible de Gundam, Patlabor, BLAME! u otra franquicia.
- Robot blanco, azul, rojo y amarillo con antenas en V como identificación central.
- Protagonista tratado como **mecha gigante pilotado** sin aprobación expresa.
- Robot demasiado humano, blandito, caricaturesco o de juguete.
- Exceso de paneles, cables y partículas que destruye la silueta.
- Luz cian neón aplicada indiscriminadamente, estética cyberpunk saturada.
- Ruinas y destrucción en **todas** las escenas, anulando la variedad del mundo.
- Arquitectura espacial o astronaves dominantes que hagan confundir el tema con Naves.
- Texto, títulos, botones, recuadros informativos, logotipos o marcas **dibujados dentro de `hero`, `card` o `emblem`**.
- Distorsión del tamaño o recorte del protagonista al adaptar formatos.

**Criterio de corrección:** si una ilustración resulta demasiado realista, reducir gradientes, aumentar lectura de contornos y recuperar masas de sombreado cel-shaded. Si el protagonista parece gigantesco, revisar el encuadre y añadir referencias de escala humana o urbana.

---

## 13. Recursos gráficos y especificaciones técnicas

Los recursos previstos del tema son:

| Recurso | Tamaño final objetivo | Proporción | Función |
|---|---:|---|---|
| `hero.webp` | **1920 × 1080 px** | **16:9** | Portada principal cinematográfica |
| `card.webp` | **768 × 1024 px** | **3:4** | Tarjeta vertical de selección del mundo |
| `emblem.png` | **1024 × 1024 px** | **1:1** | Símbolo distintivo transparente |
| `background.webp` (opcional) | **1920 × 1080 px** | **16:9** | Fondo adicional, solo si se solicita |

**Reglas del `hero`:** reservar preferentemente el tercio izquierdo para los textos y botones **de la interfaz real**; situar el foco protagonista en centro-derecha; no colocar detalles esenciales pegados a los bordes; mantener lectura con degradados oscuros superpuestos; nada de texto ni UI pintados.

**Reglas de la `card`:** composición vertical específica, no mero recorte del `hero`; reproducir **el mismo robot** con iguales proporciones, cabeza, visor, núcleo, placas, colores y desgaste una vez estén aprobados; asegurar lectura en miniatura y margen de recorte.

**Reglas del `emblem`:** 1:1, fondo **realmente transparente (canal alfa)**; símbolo derivado del concepto aprobado, de silueta clara y reconocible a **48 × 48 px**; evitar microcircuitos y líneas muy finas que desaparezcan.

**Producción y entrega:**

- Generar primero la pieza aprobada y conservar el **original de máxima calidad**.
- Cuando la herramienta no admita el tamaño exacto, respetar proporción y adaptar posteriormente **sin deformar**; nunca estirar la imagen para fingir las dimensiones.
- Convertir a WebP/PNG finales **solo cuando corresponda o lo solicite el usuario**.
- Comprobar dimensiones, formato y transparencia antes de etiquetar un archivo como exportación definitiva.
- Los nombres finales siguen los recursos previstos; **no modificar carpetas, YAML ni integración del repositorio** desde el chat de ilustración.

**Importante:** las especificaciones anteriores **no implican que estos diseños ya estén aprobados**. Son criterios para futuras propuestas.

---

## 14. Procedimiento obligatorio de trabajo y aprobaciones

Trabajar **un mundo completo cada vez**, sin pasar a otro hasta que el usuario lo indique. Para Robot, proceder por pieza:

1. **Leer** `ROBOT_DIRECCION_ARTISTICA.md` y **examinar** `ROBOT_FICHA_VISUAL.png`.
2. **Presentar una propuesta previa** del recurso solicitado: narrativa, diseño del robot y elementos distintivos, materiales, escenario, iluminación, encuadre y continuidad con las otras piezas.
3. **Esperar aprobación explícita** o correcciones del usuario antes de generar.
4. **Generar únicamente** el recurso aprobado, en proporción adecuada y sin elementos de interfaz.
5. Mostrar el resultado y **esperar valoración**.
6. Si se solicitan retoques, **editar la imagen existente** cuando sea posible, para conservar identidad y composición; no empezar de cero por defecto.
7. Tras aprobar el `hero`, reutilizarlo como **referencia visual efectiva** de personaje al crear la `card`; después diseñar el `emblem` sobre ambas referencias aprobadas.
8. Conservar originales y, cuando proceda, entregar versiones convertidas a su tamaño/formato final.

**Regla absoluta:** **no generar imágenes oficiales antes de presentar la propuesta concreta y obtener aprobación**. La aprobación de esta guía y la ficha autoriza la *dirección artística general*, **no** aprueba por adelantado los diseños finales de todos los recursos.

---

## 15. Instrucciones reutilizables para un nuevo chat

### Mensaje inicial recomendado

> Este chat se dedica exclusivamente a crear ilustraciones oficiales del mundo **Robot** de Fatebound 2.0. Te adjunto `ROBOT_DIRECCION_ARTISTICA.md` y `ROBOT_FICHA_VISUAL.png`. **Lee el Markdown completo y examina la ficha antes de proponer nada**. La dirección artística general ya está aprobada: anime mecha industrial ilustrado, cel shading y líneas mecánicas precisas, con fondos tecnológicos pictóricos, grafito/acero y luz cian selectiva. Robot representa un viajero autónomo entre megaciudades e instalaciones tecnológicas, no un mecha gigante pilotado. No queremos realismo fotográfico ni personajes copiados de otras franquicias. Antes de **cada imagen**, preséntame una propuesta artística concreta y espera mi aprobación. Primero trabajaremos `hero`, después `card` y finalmente `emblem`, reutilizando las imágenes aprobadas como referencias visuales. No cambies YAML, estructura ni arquitectura del proyecto.

### Núcleo de instrucción de imagen (una vez aprobada la propuesta concreta)

> Ilustración original para **Robot / Fatebound 2.0**, con **estética de anime mecha industrial dibujado**, contornos mecánicos limpios, cel shading, sombras en planos y fondos pictóricos de megainfraestructura. Robot autónomo de diseño original, placas grafito/acero con reparaciones, visor y núcleo de memoria cian, en un entorno tecnológico monumental pero de escala coherente. Paleta anclada en `#10191F`, `#1A2830`, `#263B44`, `#45C8D1`, `#84A5B2` y `#E5F0F0`. Ambiente de exploración, soledad y misterio. **No fotorrealismo, no CGI, no clon de Gundam ni otros personajes**, no textos ni UI. Aplicar la composición específica ya aprobada para la pieza solicitada y, si existe, seguir la imagen anterior aprobada.

La instrucción breve **complementa** esta guía: no sustituye revisar el Markdown completo y la ficha.

---

## 16. Lista de comprobación de calidad antes de aprobar

Revisar cada nueva imagen con estas preguntas:

- [ ] ¿Se percibe **ilustrada / anime mecha**, y no como CGI o fotografía?
- [ ] ¿El personaje o maquinaria tienen diseño **original** y no reconocible como una franquicia concreta?
- [ ] ¿Se distinguen silueta, cabeza, visor y núcleo central sin depender de detalles minúsculos?
- [ ] ¿Dominan grafito y acero, con cian tecnológico **selectivo**?
- [ ] ¿Coinciden los colores clave con el YAML y no con posibles errores impresos de la ficha?
- [ ] ¿La arquitectura transmite escala y función industrial sin hacer gigantesco al robot protagonista por accidente?
- [ ] ¿El entorno añade exploración y relato, en lugar de ser solo un fondo genérico?
- [ ] ¿El nivel de desgaste sugiere historia y reparaciones sin convertirlo todo en chatarra?
- [ ] ¿Se conserva el diseño de protagonista ya aprobado en otras piezas, si existe?
- [ ] ¿El formato, encuadre, área libre para UI y márgenes son adecuados al recurso?
- [ ] ¿No hay textos, botones, marcos de interfaz ni logos introducidos en la imagen final?
- [ ] ¿Se ha verificado la proporción, el tamaño real y la transparencia cuando se declara un archivo final?
- [ ] ¿La imagen fue **propuesta y aprobada antes de generarse**, conforme al flujo acordado?

---

## 17. Decisiones cerradas, aspectos abiertos y futuras revisiones

### Decisiones cerradas

- Nombre e ID del tema: **Robot / `robot`**.
- Lema oficial: **«Memoria, acero e identidad»**.
- Valores de color oficiales y atributos del YAML; no deben rediseñarse.
- Estilo general: **anime mecha industrial ilustrado**, cel shading, líneas técnicas, fondos pictóricos; **no fotorrealista**.
- Mundo centrado en un **robot errante autónomo**, ciudades e instalaciones tecnológicas; influencias de Gundam, Patlabor y BLAME! **sin copiar franquicias**.
- Referencia visual general asociada: **`ROBOT_FICHA_VISUAL.png`**.
- Se utilizará una guía autónoma con **estas mismas 17 secciones**, compatible con las demás guías de Fatebound.
- Procedimiento de **propuesta → aprobación → generación → revisión**, recurso a recurso.

### Aspectos abiertos (necesitan propuesta y aprobación posteriores)

- Diseño definitivo del robot: cabeza, proporciones, esquema exacto de paneles, accesorios, desgaste y si usa capa u otra prenda.
- Escenario y composición concretos del `hero`.
- Encuadre y pose concretos de la `card`, basados en el `hero` aprobado.
- Geometría final del `emblem`.
- La escala narrativa propuesta para el robot es **aproximadamente humana (en torno a dos metros)** y evita por defecto el mecha gigante; se puede concretar al aprobar al personaje.
- Las historias, facciones, épocas internas, tecnologías específicas y otros detalles del universo no se fijan en esta guía artística.

### Regla de futuras revisiones

Cuando el usuario apruebe una ilustración, **anotar sus decisiones visuales definitivas** en una revisión de este documento: rasgos constantes, referencias de imagen, variantes permitidas y cambios introducidos. Mantener las 17 secciones y los nombres de archivo estables salvo instrucción expresa. **No presentar una decisión provisional como canon definitivo.**

---

**Resumen:** Robot debe parecer un **anime mecha industrial original y dibujado**, con protagonista autónomo de grafito y acero, visor/núcleo cian, arquitectura tecnológica monumental y un ambiente de exploración melancólica. La ficha visual muestra el lenguaje gráfico aprobado; este Markdown establece cómo reproducirlo con consistencia y cómo validar las imágenes nuevas.

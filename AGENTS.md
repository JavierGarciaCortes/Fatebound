# Instrucciones para agentes

Este archivo se aplica a todo el repositorio de Fatebound.

## Flujo de trabajo obligatorio

1. Inspecciona el código, la configuración y la documentación antes de modificar nada. No consultes el estado de Git salvo solicitud expresa de la tarea actual.
2. Respeta el alcance solicitado. No implementes características adyacentes ni anticipes fases futuras.
3. Explica y solicita aprobación antes de cambiar una decisión de arquitectura ya acordada.
4. Mantén `README.md` y `STATUS.md` actualizados en cada tarea para que describan el estado real del proyecto.
5. Añade únicamente las pruebas automatizadas indispensables para el comportamiento nuevo, pero no ejecutes comandos de validación salvo que la tarea actual lo solicite expresamente.
6. No ejecutes `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:win`, `git diff --check`, `git status -sb` ni pruebas visuales automatizadas extensas. El equipo realizará esas comprobaciones manualmente desde PowerShell después de la implementación.
7. No hagas commits ni `push` sin autorización explícita.

## Flujo reducido permanente

- Implementa el alcance solicitado, revisa razonablemente el código modificado y actualiza la documentación correspondiente.
- Evita baterías de pruebas redundantes, reconstrucciones repetidas del ejecutable e informes extensos archivo por archivo.
- En la entrega, distingue con claridad lo implementado de las comprobaciones que siguen pendientes de ejecución manual.

## Criterios de implementación

- Usa TypeScript estricto y conserva la separación de responsabilidades entre dominio, aplicación, infraestructura e interfaz.
- Mantén aislados los procesos `main`, `preload` y `renderer` de Electron. El renderer no debe acceder directamente al sistema de archivos, a SQLite ni a otras API nativas.
- Expón únicamente contratos IPC mínimos, tipados, validados y controlados mediante el preload.
- Diseña la interfaz como una experiencia de aventura narrativa —«RPG cinematográfico + diario de aventuras»—, no como un panel empresarial ni como un administrador de base de datos.
- Mantén la navegación compartida separada del tema declarativo de cada mundo. Un paquete de mundo puede aportar recursos y valores visuales validados, pero nunca código, scripts, CSS arbitrario ni acceso a API nativas.
- Prioriza legibilidad, contraste, navegación clara, foco visible, sesiones largas y reducción de movimiento sobre efectos decorativos o animaciones prolongadas.
- Identifica expresamente cualquier tema, mundo, personaje o partida de demostración; no presentes prototipos visuales como contenido jugable ni controles futuros como funcionalidad disponible.
- Los diagnósticos visibles de almacenamiento deben proceder de consultas mínimas en main mediante IPC/preload seguro. No expongas rutas sensibles innecesarias, SQL, acceso general al sistema de archivos ni la conexión SQLite.
- No uses rutas absolutas dependientes de un equipo. Toda ruta de datos o recursos debe resolverse en tiempo de ejecución y funcionar en desarrollo y en la distribución portable.
- Trata el contenido importado como datos no confiables: no ejecutes código, scripts ni reglas expresadas en lenguaje natural.
- Trata los futuros paquetes de mundos como archivos ZIP no confiables. Valida versión, estructura, rutas, tamaños, YAML, Markdown, imágenes y temas antes de instalarlos, e impide escapes de directorio, enlaces inseguros y contenido ejecutable.
- La distribución pública debe poder construirse sin mundos ni contenido protegido de terceros. No presupongas que Ronin u otro mundo puede incluirse en un artefacto público.
- Mantén separadas y explícitas las variantes de distribución pública y privada. Una contraseña u ofuscación no convierte en distribuible un contenido para el que no existan permisos.
- Las plantillas y ejemplos incluidos deben ser originales de Fatebound. No copies textos, tablas, reglas ni otros contenidos del reglamento de Ronin o de terceros.
- No fijes una especificación definitiva del formato de mundos fuera de una tarea dedicada y aprobada; conserva documentados sus requisitos y compatibilidad esperada.
- Mantén separadas las reglas, los datos de cada mundo y el estado de las partidas.
- Evoluciona las capacidades mecánicas de forma aditiva y compatible. No rompas mundos ni partidas existentes sin una estrategia explícita, versionada, probada y protegida de compatibilidad y migración.
- Preserva los datos del usuario, los recursos existentes y la compatibilidad entre versiones. No renombres, muevas ni reemplaces recursos sin que la tarea lo requiera expresamente.
- Protege los mundos instalados que correspondan frente al borrado accidental mediante flujos destructivos explícitos; nunca elimines contenido o partidas de forma implícita.
- Las versiones publicadas de contenido deben permanecer inmutables; una modificación crea una versión nueva.
- Añade o actualiza pruebas cuando cambie comportamiento comprobable. Una corrección de defecto debe incluir una prueba de regresión cuando sea viable.
- Evita dependencias nuevas salvo necesidad justificada y aprobada.

## Documentación y veracidad

- Distingue siempre entre decisiones arquitectónicas, propuestas, trabajo en curso y funcionalidad implementada.
- No declares completado ni verificado algo que no esté implementado y comprobado.
- Registra en `STATUS.md` los resultados reales de validación, los problemas conocidos y una sola siguiente tarea prioritaria.
- Mantén `README.md` orientado a explicar el producto, su puesta en marcha y su estado actual; conserva el detalle técnico en `docs/`.

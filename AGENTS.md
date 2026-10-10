# Instrucciones para agentes

Este archivo se aplica a todo el repositorio de Fatebound.

## Flujo de trabajo obligatorio

1. Inspecciona el código, la configuración, la documentación y el estado de Git antes de modificar nada.
2. Respeta el alcance solicitado. No implementes características adyacentes ni anticipes fases futuras.
3. Explica y solicita aprobación antes de cambiar una decisión de arquitectura ya acordada.
4. Mantén `README.md` y `STATUS.md` actualizados en cada tarea para que describan el estado real del proyecto.
5. Ejecuta las comprobaciones disponibles y relevantes de `package.json` antes de finalizar. Si alguna no puede ejecutarse o falla, indícalo expresamente.
6. Revisa `git diff` y `git status` antes de entregar el trabajo.
7. No hagas commits ni `push` sin autorización explícita.

## Criterios de implementación

- Usa TypeScript estricto y conserva la separación de responsabilidades entre dominio, aplicación, infraestructura e interfaz.
- Mantén aislados los procesos `main`, `preload` y `renderer` de Electron. El renderer no debe acceder directamente al sistema de archivos, a SQLite ni a otras API nativas.
- Expón únicamente contratos IPC mínimos, tipados, validados y controlados mediante el preload.
- No uses rutas absolutas dependientes de un equipo. Toda ruta de datos o recursos debe resolverse en tiempo de ejecución y funcionar en desarrollo y en la distribución portable.
- Trata el contenido importado como datos no confiables: no ejecutes código, scripts ni reglas expresadas en lenguaje natural.
- Mantén separadas las reglas, los datos de cada mundo y el estado de las partidas.
- Preserva los datos del usuario, los recursos existentes y la compatibilidad entre versiones. No renombres, muevas ni reemplaces recursos sin que la tarea lo requiera expresamente.
- Las versiones publicadas de contenido deben permanecer inmutables; una modificación crea una versión nueva.
- Añade o actualiza pruebas cuando cambie comportamiento comprobable. Una corrección de defecto debe incluir una prueba de regresión cuando sea viable.
- Evita dependencias nuevas salvo necesidad justificada y aprobada.

## Documentación y veracidad

- Distingue siempre entre decisiones arquitectónicas, propuestas, trabajo en curso y funcionalidad implementada.
- No declares completado ni verificado algo que no esté implementado y comprobado.
- Registra en `STATUS.md` los resultados reales de validación, los problemas conocidos y una sola siguiente tarea prioritaria.
- Mantén `README.md` orientado a explicar el producto, su puesta en marcha y su estado actual; conserva el detalle técnico en `docs/`.


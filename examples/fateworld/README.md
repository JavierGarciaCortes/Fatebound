# Muestra técnica `.fateworld` v1

`echoes-of-the-tide/` contiene las fuentes originales de la muestra técnica **Ecos de la marea**. `echoes-of-the-tide-1.0.0.fateworld` es el ZIP reproducible generado a partir de esas fuentes.

Para reconstruirlo desde la raíz del repositorio:

```bash
npm run build:example-world
```

El script usa únicamente API estándar de Node, orden estable de rutas, entradas sin compresión y una fecha ZIP fija. La muestra sirve para probar el contrato y el validador; no se instala, no aparece en la interfaz y no constituye un mundo jugable.

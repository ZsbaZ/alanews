# alanews.

El diario personal de Sebas: negocios, Perú y el mundo, explicados para que se queden.
Diseño inspirado en el orden de Axios y lo interactivo de The Pudding. Hecho con Claude.

## Cómo está armado

| Archivo | Qué hace |
|---|---|
| `index.html` | La estructura de la página |
| `estilos.css` | Colores, fuentes y tamaños (computadora y celular) |
| `app.js` | Lo interactivo: chips, flashcards con repetición espaciada, cuaderno, pestañas |
| `personajes.js` | Los dibujos: fantasmita, edificio, chanchito, llama, león y dragón |
| `ediciones/` | El contenido de cada día (`000.json`, `001.json`…) y el índice del archivo |

El diseño y el contenido están separados: para publicar una edición nueva solo hay que agregar
un archivo en `ediciones/` y sumarlo a `ediciones/index.json`.

## Qué se guarda y dónde

Tus notas del cuaderno y tu progreso de repaso se guardan en el navegador de cada dispositivo.

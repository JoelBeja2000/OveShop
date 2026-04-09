# 🖼️ OveShop - Orquestador Creativo de IA con Materialidad Semántica

👉 [Read in English](README.md)

OveShop no es un editor de imágenes convencional; es una herramienta de orquestación diseñada para traducir la intención creativa en resultados realistas mediante un sistema único de prompts jerárquicos y mapeo de materiales.

![App Header Placeholder](https://via.placeholder.com/1200x400?text=OveShop+AI+Creative+Suite)

## 🚀 Puntos Distintivos (Lo que nos hace únicos)

### 1. Jerarquía de Prompts (Multi-Prompt Layers) 🤖
A diferencia de otras apps que usan un único prompt global, en OveShop:
- **Prompts Individuales**: Cada imagen o capa tiene su propia descripción. Puedes indicar que una piedra sea "roja" o tenga "musgo" sin afectar al resto de la escena.
- **Capas Enlazadas**: Puedes vincular capas entre sí. Cada entidad mantiene su prompt individual, mientras que el grupo puede tener un prompt colectivo para definir su relación.
- **Control Total**: Enlaza tantas capas como quieras y asigna múltiples prompts para lograr una precisión absoluta en el renderizado final.

### 2. Tinta Semántica (Dibujo con Propiedades) ✍️
Dibujar en OveShop no es solo poner píxeles, es asignar propiedades físicas:
- **Color = Material**: Cada color de trazo puede tener asignado un material o propiedad (ej: metal, luz, profundidad).
- **Materialidad**: Si dibujas con un color asignado a "grabado", la IA procesará ese trazo como una incisión física sobre la superficie inferior, no como una simple mancha.

### 3. Tipografía Material (Texto aware de Superficie) 🔡
El texto en OveShop interactúa con el entorno:
- **Profundidad por Color**: Asigna a cada color de texto una propiedad. Por ejemplo, el color marrón puede indicar "grabado profundo" sobre una piedra, mientras que otro color puede indicar "relieve" o "resplandor".
- **Interacción Física**: La IA entiende cómo el texto afecta a la luz y sombras de la textura donde está posicionado.

### 4. Deformación Rápida (Guía para la IA) 📐
- **Blueprint Geométrico**: Deforma y ajusta los elementos rápidamente para que coincidan con la perspectiva de la foto.
- **Post-procesado**: Esta pre-deformación sirve de guía vital para que la IA procese la imagen final sin alucinaciones geométricas, manteniendo la coherencia visual.

## 🛠️ Instalación y Uso

### Prerrequisitos
- Node.js (Última LTS)
- Una **API Key de Google Gemini** ([Consíguela aquí](https://aistudio.google.com/app/apikey))

### Inicio Rápido
1. `npm install`
2. `npm run dev`
3. Introduce tu API Key y empieza a crear.

## 📄 Licencia
Este proyecto está bajo la [Licencia MIT](./LICENSE).

---
Desarrollado con ❤️ por [Joel Barea](https://github.com/JoelBeja2000)

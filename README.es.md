# 🖼️ OveShop - Editor y Compositor de Imágenes por IA

👉 [Read in English](README.md)

OveShop es una potente herramienta de edición de imágenes que utiliza **IA Multimodal de Google Gemini** para integrar elementos de forma fluida en cualquier foto. Combinando imágenes subidas por el usuario con composición avanzada por IA, OveShop permite manipulaciones de imagen de nivel profesional con simples interacciones de arrastrar y soltar.

![App Header Placeholder](https://via.placeholder.com/1200x400?text=OveShop+AI+Image+Editor)

## ✨ Características Principales

- **🤖 Composición por IA**: Utiliza Gemini 3 Pro para generar renders realistas de elementos integrados en tu imagen base.
- **📷 Subida de Assets Locales**: Sube cualquier imagen o icono desde tu PC para usar en tus composiciones.
- **📐 Perspectiva y Oclusión**: Posicionamiento inteligente de elementos que respeta la geometría y profundidad de la escena.
- **🔄 Comparación Antes/Después**: Slider interactivo para visualizar la transformación de la IA.
- **🎨 Galería de Assets**: Organiza tus subidas personalizadas en categorías (Fondo, Objeto, Personaje, Efecto).
- **✍️ Dibujo Manual**: Motor de dibujo vectorial (SVG) integrado para bocetar directamente sobre el lienzo.

## 🚀 Tecnologías

- **Frontend**: React 19 + Vite + TypeScript
- **Mobile**: Capacitor (Android/iOS)
- **Motor de IA**: Google Generative AI (Gemini)
- **Estilos**: CSS Moderno con Glassmorphism y diseño responsivo

## 🛠️ Arquitectura

OveShop sigue un patrón de **Arquitectura Limpia** para asegurar escalabilidad:

- **Domain**: Lógica de negocio pura y definiciones de entidades (`AssetItem`, `PlacedItem`).
- **Infrastructure**: Implementaciones concretas para servicios externos (Adapters de IA, Procesamiento de Imagen).
- **Application**: Lógica de unión y componentes de React.

Consulta [ARCHITECTURE.md](./ARCHITECTURE.md) para un desglose detallado.

## 🏁 Primeros Pasos

### Prerrequisitos

- Node.js (Última LTS)
- NPM o Yarn
- Android Studio / Xcode (para builds móviles)
- Una **API Key de Google Gemini**

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/JoelBeja2000/OveShop.git
   cd OveShop
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Ejecuta en modo desarrollo:
   ```bash
   npm run dev
   ```

## 🔐 Seguridad y Privacidad

OveShop prioriza tu seguridad. **Ninguna API Key o imagen personal se sube a nuestros servidores.**
- Las API Keys se introducen localmente y se guardan de forma segura en tu dispositivo.
- El procesamiento de imágenes ocurre directamente entre tu dispositivo y la API de Google Gemini.

## 📄 Licencia

Este proyecto está bajo la [Licencia MIT](./LICENSE).

---

Desarrollado con ❤️ por [Joel Barea](https://github.com/JoelBeja2000)

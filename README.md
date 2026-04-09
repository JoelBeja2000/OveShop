# 🖼️ OveShop - AI Image Editor & Compositor

👉 [Leer en Español](README.es.md)

OveShop is a powerful image editing tool that leverages **Google Gemini Multimodal AI** to seamlessly integrate assets into any photo. By combining user-uploaded images with advanced AI composition, OveShop allows for professional-grade image manipulation with simple drag-and-drop interactions.

![App Header Placeholder](https://via.placeholder.com/1200x400?text=OveShop+AI+Image+Editor)

## ✨ Key Features

- **🤖 AI Composition**: Uses Gemini 3 Pro to generate realistic renders of assets integrated into your base image.
- **📷 Local Asset Upload**: Upload any image or icon from your PC to use in your compositions.
- **📐 Perspective & Occlusion**: Smart placement of items that respect the scene's geometry and depth.
- **🔄 Before/After Comparison**: Interactive slider to visualize the AI's transformation.
- **🎨 Asset Library**: Organize your custom uploads into categories (Background, Object, Character, Effect).
- **✍️ Manual Drawing**: Integrated SVG vector engine for sketching directly on the canvas.

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Mobile**: Capacitor (Android/iOS)
- **AI Engine**: Google Generative AI (Gemini)
- **Styling**: Modern CSS with Glassmorphism and responsive design

## 🛠️ Architecture

OveShop follows a **Clean Architecture** pattern to ensure scalability and maintainability:

- **Domain**: Pure business logic and entity definitions (`AssetItem`, `PlacedItem`).
- **Infrastructure**: Concrete implementations for external services (AI Adapters, Image Processing).
- **Application**: Glue logic and React components.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown.

## 🏁 Getting Started

### Prerequisites

- Node.js (Latest LTS)
- NPM or Yarn
- Android Studio / Xcode (for mobile builds)
- A **Google Gemini API Key**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JoelBeja2000/OveShop.git
   cd OveShop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

## 🔐 Security & Privacy

OveShop prioritizes your security. **No API keys or personal images are ever uploaded to our servers.**
- API keys are entered locally and stored securely on your device.
- Image processing happens between your device and the Google Gemini API directly.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

Developed with ❤️ by [Joel Barea](https://github.com/JoelBeja2000)

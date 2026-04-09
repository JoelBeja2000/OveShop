# Architecture Overview - OveShop

OveShop is built on a modular architecture that separates concerns between the UI, business logic, and professional creative tools.

## Layer Diagram

```mermaid
graph TD
    UI[React Components / UI Layer] --> App[Application Logic]
    App --> Domain[Domain Entities & Types]
    App --> Drawing[Drawing Module (SVG)]
    App --> Canvas[Canvas Config System]
    App --> Infra[Infrastructure Layer]
    
    subgraph Infrastructure
        Adapter[Gemini AI Adapter]
        Processor[Image Processor]
        Storage[LocalStorage Palette Sync]
    end
    
    Adapter --> Gemini[Google Gemini API]
    Processor --> CanvasAPI[HTML5 Canvas API]
```

## Core Components

### 1. Manual Drawing Module (`DrawingElement.tsx`)
The `DrawingModule` implements a professional-grade sketching system using pure SVG:
- **Vector-Based**: All strokes are stored as point arrays and rendered as SVG paths, ensuring infinite scalability without resolution loss.
- **Normalization**: Coordinates are normalized to a 0-100% relative coordinate system, allowing drawings to maintain their scale and position regardless of the background resolution.
- **Hitbox Logic**: Dynamic bounding box calculation recalculates the item's perimeter upon stroke completion, ensuring precise selection and transformation.
- **Stroke Scaling**: Implements a compensation factor to maintain visual brush width consistency even when the drawing is scaled or resized.

### 2. Canvas Configuration System
Enables professional workspace setup:
- **CanvasConfigModal**: Orchestrates resolution (W/H), background color, and the "Photoshop Grid" (transparency linear-gradients).
- **Flexible Flow**: System unlocks access to Asset Libraries and Drawing Tools as soon as a background is defined (either by image or manual config).

### 3. Color Management & Palettes
- **Auto-Preservation**: A reactive listener in `App.tsx` captures any color picked from the native dialog and automatically integrates it into the `customPalette` (LRU Cache logic).
- **Delete Mode**: A togglable UI state that allows users to prune and manage their favorite colors directly from the sidebar.
- **Semantic Mapping (Glossary)**: Allows users to map hex codes to business labels (e.g., `#A2AD91` -> "Savia Alpinia"), used for AI-prompt generation and client reports.

### 4. Gemini AI Adapter
- **Blackout Zones**: Masking areas where items are placed to help the AI understand depth.
- **Prompt Engineering**: Building dynamic prompts focused on "Strict" vs "Generative" behaviors.

## Data Flow

1. **Setup**: User defines the workspace via `CanvasConfigModal` or by uploading a base image.
2. **Creation**: User adds decorations (`DecorationCarousel`) or creates freehand sketches (`DrawingModule`).
3. **Refinement**: Colors and textures are adjusted; custom palettes are synchronized via `LocalStorage`.
4. **Rendering**:
    - The `Processor` generates a blueprint composite.
    - `GeminiAIAdapter` orchestrates the final realistic render request.
5. **Versioning**: Progress is documented in `HISTORY.md` using the GHS Level 3 protocol.

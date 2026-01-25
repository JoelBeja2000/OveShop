
import { GoogleGenAI } from "@google/genai";
import { PlacedItem } from "../../domain/types";

export interface AIResponse {
    image: string;
}

export class GeminiAIAdapter {
    private genAI: GoogleGenAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async generateRender(
        backgroundImage: string,
        collageImage: string,
        placedItems: PlacedItem[],
        aspectRatio: "1:1" | "4:3" | "3:4" | "9:16" | "16:9"
    ): Promise<AIResponse> {

        const strictItems = placedItems
            .filter(i => i.visualBehavior === 'strict')
            .map(i => this.getStrictItemPrompt(i))
            .join('\n');

        const creativeItems = placedItems
            .filter(i => i.visualBehavior === 'generative')
            .map(i => this.getCreativeItemPrompt(i))
            .join('\n');

        const prompt = this.buildPrompt(strictItems, creativeItems);

        const originalData = backgroundImage.split(',')[1];
        // collageImage might be data URL, split if needed
        const collageData = collageImage.includes(',') ? collageImage.split(',')[1] : collageImage;

        try {
            const response = await this.genAI.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: [{
                    parts: [
                        { text: prompt },
                        { text: "Original Photo (Base):" },
                        { inlineData: { mimeType: 'image/jpeg', data: originalData } },
                        { text: "Placement Blueprint (Guide):" },
                        { inlineData: { mimeType: 'image/jpeg', data: collageData } }
                    ]
                }],
                config: {
                    temperature: 0.3,
                    imageConfig: { aspectRatio, imageSize: "1K" }
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    return { image: `data:image/png;base64,${imagePart.inlineData.data}` };
                }
            }
            throw new Error("No image generated");
        } catch (error) {
            console.error("Gemini Adapter Error:", error);
            throw error;
        }
    }

    private getStrictItemPrompt(item: PlacedItem): string {
        return `   - [OBRA DE AUTOR / FIJO] "${item.name.toUpperCase()}": 
             * MANTENER ASPECTO VISUAL EXACTO: No cambiar patrones, colores ni formas internas. Es una pieza de diseño específica.
             * INTEGRACIÓN: Solo aplicar iluminación, sombras y corrección de color global para que encaje en la foto.`;
    }

    private getCreativeItemPrompt(item: PlacedItem): string {
        return `   - [ELEMENTO GENERATIVO / AUTO] "${item.name.toUpperCase()}": 
             * REIMAGINAR COMPLETAMENTE: Usar la mancha de color/forma del blueprint solo como guía de volumen y posición.
             * GENERAR DESDE CERO: Crear una versión hiper-realista, de alta gama y materialidad premium (texturas ricas, imperfecciones reales).
             * COHERENCIA: Si es un objeto orgánico (planta, roca), que parezca vivo. Si es manufacturado, acabados perfectos.`;
    }

    private buildPrompt(strictItems: string, creativeItems: string): string {
        return `ACT AS AN EXPERT INTERIOR DESIGN CGI ARTIST. YOUR GOAL IS TO MERGE A "PLACEMENT BLUEPRINT" INTO AN "ORIGINAL PHOTO" WITH PERFECT REALISM.

      CONTEXT:
      - The "Original Photo" is the real room.
      - The "Placement Blueprint" contains rough cutouts of items placed by the user.

      INSTRUCTIONS FOR OBJECT PLACEMENT & VISUAL BEHAVIOR:
      
      1. **VISUAL FIDELITY RULES (CRITICAL):**
         A. **ITEMS MARKED "FIJO/AUTOR" (STRICT):**
            - **CRITICAL**: The texture/image in the blueprint IS the final finish. DO NOT REPLACE IT.
            - **TASK**: This is an IMAGE COMPOSITING task for these items, NOT a generation task. 
            - **PROHIBITED**: Do not interpret the content (e.g., if it looks like abstract moss, DO NOT turn it into a forest landscape).
            - **ALLOWED**: Only add lighting, shadows, and slight color grading to match the room. The internal geometry and pattern must remain 99% identical to the blueprint.
         
         B. **ITEMS MARKED "AUTO/GENERATIVO":**
            - REPLACE the rough cutout with a high-quality, photorealistic rendering of that object.
            - IMPROVE materials, textures, and geometry. Make it look expensive/premium.
            - If the blueprint looks flat or low-res, IGNORE the artifacting and render a perfect 3D object in that space.

      2. **SPATIAL INTELLIGENCE & OCCLUSION:**
         - **DEPTH AWARENESS:** If a placed object is positioned "behind" a real object in the photo (e.g., behind a sofa edge, behind a person), YOU MUST MASK IT. Do not paint over foreground elements unless the object is explicitly in front.
         - **SMART REPLACEMENT:** If a placed object (like a rug or big furniture) COMPLETELY COVERS a real object in the photo, DELETE the real object from the scene mentally and render the new one on top definitively.
         - **SURFACE CONTACT:** 
           * Wall items must cast close drop shadows.
           * Floor items must have ambient occlusion at the base.
           * Table items must reflect if the surface is glossy.

      3. **SCENE COHERENCE:**
         - MATCH the grain, noise, and focus/blur of the Original Photo.
         - MATCH the color temperature (warm/cool) of the room's lighting.
         - RESPECT PERSPECTIVE: Align objects with the vanishing points of the room.

      LIST OF ITEMS TO INTEGRATE:
      ${strictItems}
      ${creativeItems}

      EXECUTE WITH PHOTOREALISTIC QUALITY. OUTPUT ONLY THE FINAL IMAGE.`;
    }
}

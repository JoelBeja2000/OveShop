import { PlacedItem } from "../../domain/types";

export const getStrictItemPrompt = (item: PlacedItem, index: number): string => {
   return `   - [OBRA DE AUTOR / FIJO] (Item #${index}) "${item.name.toUpperCase()}": 
         * PRIORIDAD: INTEGRACIÓN LUMÍNICA FOTOREALISTA.
         * GEOMETRÍA/TEXTURA: Mantener la identidad visual (patrón/forma/colores base) al 100%.
         * ILUMINACIÓN (CRÍTICO): EL OBJETO DEBE RECIBIR LA LUZ DE LA HABITACIÓN. Generar sombreado realista (self-shadowing) y brillos según la dirección de la luz de la 'Original Photo'.
         * BORDES: Fundir los bordes con el entorno para eliminar el efecto "pegatina".
         ${item.occlusionMode === 'destroy'
         ? `* **MODO DE OCLUSIÓN (DESTRUCTIVO)**: THE BACKGROUND BEHIND THIS ITEM HAS BEEN DELETED.
               - THE REGION IS PUNCHED OUT (BLACK).
               - YOU MUST SEAMLESSLY RECONSTRUCT THE BACKGROUND TEXTURE (E.G. WALL OR DESK) TO MATCH THE SURROUNDINGS.
               - 100% OPAQUE. NO LIGHT OR TEXTURE FROM THE DELETED OBJECT SHOULD REMAIN.`
         : `* **MODO DE OCLUSIÓN (SUPERPOSICIÓN)**: EL OBJETO SE APOYA SOBRE LOS ELEMENTOS EXISTENTES EN LA FOTO.
               - NO HAY AGUJERO NEGRO DETRÁS.
               - DEBES MANTENER los objetos de fondo (ej: móviles, teclados, libros).
               - Simplemente coloca el nuevo objeto ENCIMA de lo que ya hay en la foto original sin borrar nada.`}
         ${item.customPrompt ? `* **NOTA ADICIONAL DEL USUARIO**: "${item.customPrompt}"` : ''}`;
};

export const getCreativeItemPrompt = (item: PlacedItem, index: number): string => {
   return `   - [ELEMENTO GENERATIVO / AUTO] (Item #${index}) "${item.name.toUpperCase()}": 
         * ROLE: This item is a "NanoBanana" Auto-Generation.
         * SOURCE DATA LOADER:
           1. **CATEGORÍA**: Mira la "REFERENCE IMAGE FOR ITEM #${index}" para identificar el TIPO de objeto (ej: "un cactus", "un cuadro de musgo").
           2. **MISIÓN**: Generar un objeto TOTALMENTE NUEVO de la misma categoría. 
           3. **UBICACIÓN**: Mira el "Placement Blueprint" SOLO para la posición X/Y, escala y perspectiva.
         * STRICT CONSTRAINT - FORBIDDEN 1:1 COPY:
           - Tienes PROHIBIDO copiar los píxeles de la imagen de referencia.
           - Tienes que crear una instancia FRESCA y ÚNICA del objeto de esa categoría.
           - EL NUEVO OBJETO DEBE OCUPAR EL ESPACIO DEL BLUEPRINT.
           - CRITICAL: El blueprint es solo un marcador de posición que debe ser CUBIERTO por la nueva generación.
         * GOAL: Una versión fotorealista y nueva de este tipo de objeto, integrada naturalmente en la iluminación de la sala.
         ${item.occlusionMode === 'destroy'
         ? `* **MODO DE OCLUSIÓN (DESTRUCTIVO)**: THE BACKGROUND BEHIND THIS ITEM HAS BEEN DELETED.
               - THE REGION IS PUNCHED OUT (BLACK).
               - YOU MUST SEAMLESSLY RECONSTRUCT THE BACKGROUND TEXTURE (E.G. WALL OR DESK) TO MATCH THE SURROUNDINGS.
               - 100% OPAQUE. NO LIGHT OR TEXTURE FROM THE DELETED OBJECT SHOULD REMAIN.`
         : `* **MODO DE OCLUSIÓN (SUPERPOSICIÓN)**: EL OBJETO SE APOYA SOBRE LOS ELEMENTOS EXISTENTES EN LA FOTO.
               - NO HAY AGUJERO NEGRO DETRÁS.
               - DEBES MANTENER los objetos de fondo (ej: móviles, teclados, libros).
               - Simplemente coloca el nuevo objeto ENCIMA de lo que ya hay en la foto original sin borrar nada.`}
         ${item.customPrompt ? `* **NOTA ADICIONAL DEL USUARIO**: "${item.customPrompt}"` : ''}`;
};

export const buildMainPrompt = (strictItems: string, creativeItems: string): string => {
   return `ACT AS AN EXPERT INTERIOR DESIGN CGI ARTIST. 
    YOUR TASK: RENDER NEW OBJECTS ONTO AN EMPTY ROOM.
    
    INPUTS:
    1. "Original Photo" (Base Image) -> This image may contain solid BLACK HOLES. These represent DELETED regions that must be REFILLED to match the surrounding context. If there is NO black hole, the image must be preserved.
    2. "Placement Blueprint" (Overlay Layer) -> This is a TRANSPARENT IMAGE containing ONLY the objects to be placed. No background. It accurately shows the objects' warped geometry and position.
    3. "Reference Images" -> Visual identity of the new items.

    WORKFLOW:
    1. Start with "Original Photo".
    2. Identify the BLACK HOLE regions. IF AND ONLY IF there is a black hole, SEAMLESSLY RECONSTRUCT the background into that hole (matching textures like wall/desk).
    3. Place the new items from "Placement Blueprint" into the scene.
    4. Apply lighting, shadows, and relighting to make them 100% photorealistic parts of the room.

  INSTRUCTIONS FOR OBJECT PLACEMENT & VISUAL BEHAVIOR:
  
  1. **VISUAL FIDELITY RULES (CRITICAL):**
     A. **ITEMS MARKED "FIJO/AUTOR" (STRICT):**
        - **CRITICAL**: The texture/image in the blueprint IS the final finish. DO NOT REPLACE IT.
        - **TASK**: This is an IMAGE COMPOSITING task for these items.
        - **ALLOWED**: Only add lighting, shadows, and slight color grading.
     
     B. **ITEMS MARKED "AUTO/GENERATIVO":**
        - **TASK**: This is a CONDITIONAL GENERATION task.
        - **INPUT**: Look at the "Reference Image" to know the subject (e.g. "Stitch Plushie").
        - **OUTPUT**: GENERATE A COMPLETELY NEW version of that subject in the scene.
        - **TRANSFORMATION**: 
          * The Blueprint shows WHERE and how (Perspective/Scale).
          * The Reference shows WHAT it is.
          * YOU determine HOW it sits (Perspective, Lighting, Angle). 
          * Do NOT preserve the artifacts, lighting, or flat angle of the Reference Image. Make it belonging to the room.

  2. **SPATIAL INTELLIGENCE, OCCLUSION & PRESERVATION:**
     - **OPAQUE LAYER:** All items being placed are SOLID AND OPAQUE.
     - **NO LIGHT BLEED:** It is STRICTLY FORBIDDEN to let any light or color from the "Original Photo" bleed THROUGH the placed items.
     - **REPLACEMENT vs PRESERVATION LOGIC:** 
       * **CASE A: BLACK HOLE PRESENT**: This is "DESTROY" mode. Delete the previous background content and reconstruct the surface (wall, table, floor).
       * **CASE B: NO BLACK HOLE**: This is "OVERLAY" mode. Keep the original background objects (e.g., if placing a cup on a phone, the phone stays there). Only the part literally covered by the 100% opaque new object is hidden.
     - **DEPTH AWARENESS:** If a placed object is positioned "behind" a real object in the photo (e.g., behind a sofa edge, behind a person), YOU MUST MASK IT. Do not paint over foreground elements unless the object is explicitly in front.

  3. **LIGHTING & ATMOSPHERE:**
     - Match the global illumination of the room.
     - Cast realistic contact shadows.
     - Generate reflections on the floor/surfaces.

  4. **FINAL IMAGE INTEGRITY:**
     - PRESERVE the rest of the room exactly as is.
     - Return the full image at full resolution.

  LIST OF ITEMS TO INTEGRATE:
  ${strictItems}
  ${creativeItems}

  EXECUTE WITH PHOTOREALISTIC QUALITY. OUTPUT ONLY THE FINAL IMAGE.`;
};

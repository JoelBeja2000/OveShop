import { PlacedItem } from "../../domain/types";

export const getStrictItemPrompt = (item: PlacedItem, index: number): string => {
   return `   - [OBRA DE AUTOR / FIJO] (Item #${index}) "${item.name.toUpperCase()}": 
         * CRITICAL DIRECTIVE: DO NOT REDESIGN THIS OBJECT.
         * SOURCE OF TRUTH: The "REFERENCE IMAGE FOR ITEM #${index}" is the EXACT object to place. 
         * PROHIBITED: Do NOT change the shape, texture, color, or materials. Do NOT "interpret" or "improve" the design.
         * TASK:
           1. Cut out the object from the reference image mentally.
           2. Apply it to the "Placement Blueprint" coordinates.
           3. ONLY ADJUST LIGHTING: Add realistic shadows (drop shadow + self-shadow) and lighting reflection to match the room.
         * BORDES: Fundir los bordes con el entorno para eliminar el efecto "pegatina", pero MANTENIENDO la silueta original.
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

export const buildMainPrompt = (strictItems: string, creativeItems: string, groups: { members: string[], prompt: string }[] = []): string => {

   const relationsSections = groups.length > 0 ? `
   5. **OBJECT RELATIONSHIPS & INTERACTIONS:**
      These instructions apply ONLY if they do NOT satisfy the Strict Fidelity rules.
      ${groups.map((g, i) => `RELATION #${i + 1}:
      - MEMBERS: ${g.members.join(', ')}
      - INTERACTION LOGIC: "${g.prompt}"
      - BEHAVIORAL RULES:
        * **POSE & ACTION**: Adjust members' poses, expressions, or positions to match the logic.
        * **MATERIAL UNITY**: If a bridge is required, it must use the members' own textures.`).join('\n\n')}
    ` : '';

   return `ACT AS AN EXPERT IMAGE EDITOR & COMPOSITOR. 
    YOUR TASK: SEAMLESSLY INTEGRATE NEW ASSETS INTO THE PROVIDED IMAGE.
    
    INPUTS:
    1. "Original Photo" (Base Image) -> Background.
    2. "Placement Blueprint" -> Spatial guide (X/Y, Scale, Perspective).
    3. "Reference Images" -> Visual identity of the assets to be placed.

    WORKFLOW:
    1. Start with "Original Photo".
    2. Reconstruct any BLACK HOLES via inpainting.
    3. Place new items.
    4. APPLY LIGHTING AND RELATIONSHIP LOGIC.

   INSTRUCTIONS FOR OBJECT PLACEMENT & VISUAL BEHAVIOR:
   
   1. **HIERARCHY OF TRUTH (CRITICAL):**
      - LEVEL 1 (SUPREME): **VISUAL FIDELITY of "FIJO/AUTOR" items**. You CANNOT change their shape/design.
      - LEVEL 2: **"NOTA ADICIONAL DEL USUARIO"**.
      - LEVEL 3: **"OBJECT RELATIONSHIPS"**.
      
   2. **VISUAL FIDELITY RULES:**
      A. **ITEMS MARKED "FIJO/AUTOR" (STRICT):**
         - **CLONE THE REFERENCE IMAGE**.
         - Do NOT generate a "better" version. Use the *exact* one provided.
         - Do NOT change colors (e.g. if reference is red, do not make it white).
         - Do NOT change geometry (e.g. if reference is a spiral, keep it a spiral).
         - **ALLOWANCE**: You may only add shadows and lighting reflections.
      
      B. **ITEMS MARKED "AUTO/GENERATIVO":**
         - Generate a completely fresh instance.
         - You have full creative freedom to fulfill interactions and poses.

   3. **SPATIAL INTELLIGENCE & OCCLUSION:**
      - Preserve the background content (Overlay mode) unless there is a black hole (Destroy mode).
      - Depth awareness is mandatory.

   4. **LIGHTING & INTEGRITY:**
      - 100% photorealistic integration.
   
   ${relationsSections}

   LIST OF ITEMS TO INTEGRATE:
   ${strictItems}
   ${creativeItems}

   ================================================================================
   **POST-GENERATION ANALYSIS (MANDATORY)**:
   After generating the image, you MUST analyze the final result and estimate the VISIBLE SURFACE AREA for items with irregular shapes (like moss or grass).
   
   OUTPUT FORMAT:
   Return the final image normally.
   BUT, at the very end of your text response (if any), you MUST include a JSON block with this structure:
   
   \`\`\`json
   {
      "usageAnalysis": {
         "ITEM_ID_1": 0.0, // Estimated area in square meters (m2) based on visual coverage in the scene.
         "ITEM_ID_2": 0.0
      }
   }
   \`\`\`
   
   - Assume the average room height is 3 meters to gauge scale.
   - ONLY include items from the list above.
   ================================================================================

   EXECUTE WITH PHOTOREALISTIC QUALITY. OUTPUT ONLY THE FINAL IMAGE.`;
};

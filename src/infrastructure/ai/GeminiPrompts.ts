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

export const buildMainPrompt = (strictItems: string, creativeItems: string, groups: { members: string[], prompt: string }[] = []): string => {

   const relationsSections = groups.length > 0 ? `
   5. **OBJECT RELATIONSHIPS & INTERACTIONS (SUPERIOR DIRECTIVE):**
      These instructions OVERRIDE general behavior. Analyze the "INTERACTION LOGIC" carefully.
      ${groups.map((g, i) => `RELATION #${i + 1}:
      - MEMBERS: ${g.members.join(', ')}
      - INTERACTION LOGIC: "${g.prompt}"
      - BEHAVIORAL RULES:
        * **POSE & ACTION**: Adjust members' poses, expressions, or positions to match the logic (e.g. if pointing, modify limbs).
        * **PHYSICAL BRIDGES**: ONLY generate a physical "unión puente" (shroud, vines, beams, flow) IF the logic explicitly implies joining or releasing material. 
        * **MATERIAL UNITY**: If a bridge is required, it must use the members' own textures. 
        * **DO NOT** create glowing beams or foreign connections if the members are people interacting socially (pointing, looking, etc.).`).join('\n\n')}
    ` : '';

   return `ACT AS AN EXPERT INTERIOR DESIGN CGI ARTIST. 
    YOUR TASK: RENDER NEW OBJECTS ONTO AN EMPTY ROOM.
    
    INPUTS:
    1. "Original Photo" (Base Image) -> Background.
    2. "Placement Blueprint" -> Spatial guide (X/Y, Scale, Perspective).
    3. "Reference Images" -> Visual identity/source.

    WORKFLOW:
    1. Start with "Original Photo".
    2. Reconstruct any BLACK HOLES via inpainting.
    3. Place new items.
    4. APPLY LIGHTING AND RELATIONSHIP LOGIC.

   INSTRUCTIONS FOR OBJECT PLACEMENT & VISUAL BEHAVIOR:
   
   1. **HIERARCHY OF TRUTH (CRITICAL):**
      - LEVEL 1 (TOP): **"OBJECT RELATIONSHIPS" (Section 5)**.
      - LEVEL 2: **"NOTA ADICIONAL DEL USUARIO"** (Found in item lists).
      - LEVEL 3: **FIDELITY RULES** (Strict vs Creative).
      - *Rule Case*: If a user note says "it's releasing lines", you MUST modify the item even if it's "Strict" to show that interaction.

   2. **VISUAL FIDELITY RULES:**
      A. **ITEMS MARKED "FIJO/AUTOR" (STRICT):**
         - Preserve texture and core identity.
         - **EXCEPTION**: You MAY bend, rotate, or slightly modify the edges/pose if a RELATIONSHIP or USER NOTE requires it.
      
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

   EXECUTE WITH PHOTOREALISTIC QUALITY. OUTPUT ONLY THE FINAL IMAGE.`;
};

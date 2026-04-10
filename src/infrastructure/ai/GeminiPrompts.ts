import { PlacedItem } from "../../domain/types";

export const getStrictItemPrompt = (item: PlacedItem, index: number): string => {
   return `   - [AUTHOR ASSET / FIXED] (Item #${index}) "${item.name.toUpperCase()}": 
         * CRITICAL DIRECTIVE: DO NOT REDESIGN THIS OBJECT.
         * SOURCE OF TRUTH: The "REFERENCE IMAGE FOR ITEM #${index}" is the EXACT object to place. 
         * PROHIBITED: Do NOT change the shape, texture, color, or materials. Do NOT "interpret" or "improve" the design.
         * TASK:
           1. Extract the object from the reference image.
           2. Apply it to the "Placement Blueprint" coordinates.
           3. LIGHTING INTEGRATION: Add realistic shadows (drop shadow + contact shadow) and lighting reflections to match the environment.
         * EDGES: Blend the edges with the surroundings to eliminate the "sticker" effect while MAINTAINING the original silhouette.
         ${item.occlusionMode === 'destroy'
         ? `* **OCCLUSION MODE (DESTRUCTIVE)**: THE BACKGROUND BEHIND THIS ITEM HAS BEEN DELETED.
               - THE REGION IS PUNCHED OUT (BLACK).
               - YOU MUST SEAMLESSLY RECONSTRUCT THE ORIGINAL BACKGROUND TEXTURE TO MATCH THE ENVIRONMENT.
               - 100% OPAQUE. NO TRACE OF THE DELETED OBJECT SHOULD REMAIN.`
         : `* **OCCLUSION MODE (OVERLAY)**: THE OBJECT SITS ON TOP OF EXISTING ELEMENTS.
               - NO BLACK HOLE BEHIND.
               - PRESERVE EXISTING BACKGROUND OBJECTS (PHONES, KEYBOARDS, BOOKS).
               - SIMPLY PLACE THE NEW OBJECT OVER THE PHOTOGRAPH.`}
         ${item.customPrompt ? `* **USER ADDITIONAL NOTE**: "${item.customPrompt}"` : ''}`;
};

export const getCreativeItemPrompt = (item: PlacedItem, index: number): string => {
   return `   - [GENERATIVE ASSET / AUTO] (Item #${index}) "${item.name.toUpperCase()}": 
         * ROLE: This item is a "NanoBanana" Auto-Generation layer.
         * DATA SOURCE:
           1. **CATEGORY**: Use "REFERENCE IMAGE FOR ITEM #${index}" ONLY to identify the TYPE of object (e.g. "a cactus", "a moss frame").
           2. **MISSION**: Generate a COMPLETELY NEW object of the same category. 
           3. **LOCATION**: Use "Placement Blueprint" ONLY for X/Y position, scale, and perspective.
         * STRICT CONSTRAINT - FORBIDDEN 1:1 COPY:
           - PROHIBITED: Do NOT copy pixels from the reference image.
           - MISSION: Create a FRESH and UNIQUE instance of this category.
           - THE NEW OBJECT MUST FULLY COVER THE BLUEPRINT AREA.
         * GOAL: A photorealistic, newly generated object integrated naturally into the scene's lighting.
         ${item.occlusionMode === 'destroy'
         ? `* **OCCLUSION MODE (DESTRUCTIVE)**: THE BACKGROUND BEHIND THIS ITEM HAS BEEN DELETED.
               - THE REGION IS PUNCHED OUT (BLACK).
               - YOU MUST SEAMLESSLY RECONSTRUCT THE ORIGINAL BACKGROUND TEXTURE TO MATCH THE ENVIRONMENT.
               - 100% OPAQUE. NO TRACE OF THE DELETED OBJECT SHOULD REMAIN.`
         : `* **OCCLUSION MODE (OVERLAY)**: THE OBJECT SITS ON TOP OF EXISTING ELEMENTS.
               - NO BLACK HOLE BEHIND.
               - PRESERVE EXISTING BACKGROUND OBJECTS (PHONES, KEYBOARDS, BOOKS).
               - SIMPLY PLACE THE NEW OBJECT OVER THE PHOTOGRAPH.`}
         ${item.customPrompt ? `* **USER ADDITIONAL NOTE**: "${item.customPrompt}"` : ''}`;
};

export const buildMainPrompt = (
    strictItems: string, 
    creativeItems: string, 
    groups: { members: string[], prompt: string }[] = [],
    drawingColorLabels: Record<string, string> = {},
    customPalette: string[] = [],
    sceneResolution: { w: number, h: number } | null = null,
    isTransparent: boolean = false
): string => {

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

    const materialCatalog = Object.keys(drawingColorLabels).length > 0 ? `
    6. **SEMANTIC MATERIAL CATALOG (CRITICAL GROUNDING):**
       The drawings in the "Placement Blueprint" are color-coded semantic masks. Use these definitions for rendering:
       ${Object.entries(drawingColorLabels).map(([color, label]) => `       - COLOR "${color}": Represents "${label.toUpperCase()}". Render with realistic physical textures, specularity, and depth.`).join('\n')}
    ` : '';

    const spatialContext = sceneResolution ? `
    7. **SPATIAL GROUNDING & DENSITY:**
       - THE CANVAS RESOLUTION IS ${sceneResolution.w}x${sceneResolution.h}.
       - PROPORTIONS MUST BE 1:1. DO NOT SQUASH OR STRETCH OBJECTS.
       - ${isTransparent ? 'THE BACKGROUND IS TRANSPARENT (RENDER AS ISOLATED ASSETS OVER THE GRID).' : 'INTEGRATE INTO THE PROVIDED PHOTOGRAPHIC BACKGROUND.'}
    ` : '';

   return `ACT AS AN EXPERT IMAGE EDITOR, ARCHITECT & COMPOSITOR. 
    YOUR TASK: SEAMLESSLY INTEGRATE NEW ASSETS AND DRAWINGS INTO THE PROVIDED SCENE USING THE "NANO BANANA" (GEMINI FLASH) SEMANTIC PROTOCOL.
    
    INPUTS:
    1. "Original Photo" (Base Image) -> Background context.
    2. "Placement Blueprint" -> MANDATORY Spatial Guide and Semantic Mask.
    3. "Reference Images" -> Visual identity for specific items.

    WORKFLOW:
    1. ANALYZE SPATIAL BOUNDARIES: Every pixel in the "Placement Blueprint" is a command.
    2. MATERIAL GROUNDING: Map colors from the Semantic Material Catalog to photorealistic shaders.
    3. PHYSICS SIMULATION: Apply lighting, shadows (drop and contact), and reflections consistent with the "Original Photo".
    4. RENDER FINAL COMPOSITION.

    INSTRUCTIONS FOR OBJECT PLACEMENT & VISUAL BEHAVIOR:
    
    1. **HIERARCHY OF TRUTH (SUPREME DIRECTIVE):**
       - LEVEL 1 (ABSOLUTE): **SPATIAL FAITHFULNESS**. Do NOT move objects or change their scale from the Blueprint.
       - LEVEL 2: **VISUAL FIDELITY of "AUTHOR ASSET / FIXED" items**.
       - LEVEL 3: **SEMANTIC MATERIAL MAPPING**.
       - LEVEL 4: **USER CUSTOM PROMPTS**.
       
    2. **VISUAL FIDELITY RULES:**
       A. **ITEMS MARKED "AUTHOR ASSET / FIXED" (STRICT):**
          - CLONE the Reference Image and integrate it. No "improvements".
       
       B. **ITEMS MARKED "GENERATIVE ASSET / AUTO":**
          - Generate a fresh instance adhering to the category.
 
    3. **SEMANTIC DRAWING INTERPRETATION:**
       - The colored lines/shapes in the Blueprint are NOT art; they are VOLUME AND MATERIAL GUIDES.
       - Use the "Semantic Material Catalog" to convert these shapes into 3D photorealistic objects.

    4. **LIGHTING & INTEGRITY:**
       - Match the light source of the "Original Photo".
       - Depth-of-field must be consistent with the background plane.
    
    ${relationsSections}
    ${materialCatalog}
    ${spatialContext}

    LIST OF ITEMS TO INTEGRATE:
    ${strictItems}
    ${creativeItems}

    ================================================================================
    **POST-GENERATION ANALYSIS (MANDATORY)**:
    Analyze the final result and provide the visible surface area in square meters.
    Assume room height ~3m for scale.
    
    OUTPUT FORMAT:
    Return the image via inlineData. 
    Include this JSON block at the very END:
    
    \`\`\`json
    {
       "usageAnalysis": {
          "ITEM_ID": 0.0
       }
    }
    \`\`\`
    ================================================================================
    
    EXECUTE WITH ARCHITECTURAL PRECISION. NANO BANANA PROTOCOL ENGAGED.`;
};

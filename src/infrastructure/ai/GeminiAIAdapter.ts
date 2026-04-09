
import { GoogleGenAI } from "@google/genai";
import { PlacedItem } from "../../domain/types";
import { getStrictItemPrompt, getCreativeItemPrompt, buildMainPrompt } from "./GeminiPrompts";

export interface AIResponse {
    image: string;
    usageAnalysis?: Record<string, number>;
}

import { ImageProcessor } from "./ImageProcessor";

export class GeminiAIAdapter {
    private genAI: GoogleGenAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async generateRender(
        backgroundImage: string,
        collageImage: string,
        placedItems: PlacedItem[],
        aspectRatio: "1:1" | "4:3" | "3:4" | "9:16" | "16:9",
        relationGroups: Record<string, { prompt: string, color: string }> = {}
    ): Promise<AIResponse> {

        // 1. Prepare Prompts
        const strictItems = placedItems
            .filter(i => i.visualBehavior === 'strict')
            .map((i, idx) => getStrictItemPrompt(i, idx))
            .join('\n');

        const creativeItems = placedItems
            .filter(i => i.visualBehavior === 'generative')
            .map((i, idx) => getCreativeItemPrompt(i, idx))
            .join('\n');

        // Extract groups that actually have members
        const activeGroups = Object.entries(relationGroups).filter(([groupId]) =>
            placedItems.some(item => item.groupId === groupId)
        ).map(([groupId, data]) => {
            const members = placedItems
                .filter(item => item.groupId === groupId)
                .map(item => `"${item.name}"`);
            return { members, prompt: data.prompt };
        });

        const prompt = buildMainPrompt(strictItems, creativeItems, activeGroups);

        // 2. Prepare Images
        const processedBaseData = await ImageProcessor.blackoutOccludedAreas(backgroundImage, placedItems);
        const collageData = collageImage.includes(',') ? collageImage.split(',')[1] : collageImage;

        const parts: any[] = [
            { text: prompt },
            { text: "Original Photo (Base) - WITH BLACKOUT ZONES APPLIED:" },
            { inlineData: { mimeType: 'image/jpeg', data: processedBaseData } },
            { text: "Placement Blueprint (Guide):" },
            { inlineData: { mimeType: 'image/jpeg', data: collageData } }
        ];

        // 3. Fetch and Append Reference Images
        for (const [index, item] of placedItems.entries()) {
            try {
                const base64Data = await this.fetchImageAsBase64(item.image);
                parts.push({ text: `REFERENCE IMAGE FOR ITEM #${index} ("${item.name.toUpperCase()}"):` });
                parts.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
            } catch (e) {
                console.warn(`Failed to fetch reference image for ${item.name}`, e);
            }
        }

        try {
            const response = await this.genAI.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: [{ parts }],
                config: {
                    temperature: 0.85,
                    imageConfig: { aspectRatio, imageSize: "1K" }
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
                const textPart = response.candidates[0].content.parts.find(p => p.text);

                let usageAnalysis: Record<string, number> | undefined;

                if (textPart?.text) {
                    try {
                        const jsonMatch = textPart.text.match(/```json\n([\s\S]*?)\n```/) || textPart.text.match(/{[\s\S]*}/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[1] || jsonMatch[0];
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.usageAnalysis) {
                                usageAnalysis = parsed.usageAnalysis;
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to parse usage analysis JSON", e);
                    }
                }

                if (imagePart?.inlineData) {
                    return {
                        image: `data:image/png;base64,${imagePart.inlineData.data}`,
                        usageAnalysis
                    };
                }
            }
            throw new Error("No image generated");
        } catch (error) {
            console.error("Gemini Adapter Error:", error);
            throw error;
        }
    }

    private async fetchImageAsBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

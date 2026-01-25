
import { PlacedItem } from "../../domain/types";

export class ImageProcessor {

    /**
     * Takes the original background image and "burns" black holes where "destroy" items are placed.
     * This physically removes pixels from variables the AI sees, preventing light from bleeding through.
     * Supports perspective-warped quads for pixel-perfect deletion.
     */
    static async blackoutOccludedAreas(baseImageBase64: string, placedItems: PlacedItem[]): Promise<string> {
        return new Promise((resolve) => {
            // 1. Create canvas & load image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const src = baseImageBase64.startsWith('data:') ? baseImageBase64 : `data:image/jpeg;base64,${baseImageBase64}`;
            img.crossOrigin = "anonymous";

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;

                if (ctx) {
                    ctx.drawImage(img, 0, 0);

                    const destroyItems = placedItems.filter(i => i.occlusionMode === 'destroy');

                    if (destroyItems.length === 0) {
                        resolve(baseImageBase64.split(',')[1] || baseImageBase64);
                        return;
                    }

                    ctx.fillStyle = "black";

                    for (const item of destroyItems) {
                        ctx.save();

                        const cx = (item.x / 100) * canvas.width;
                        const cy = (item.y / 100) * canvas.height;
                        const baseProportionalSize = canvas.height * 0.35;
                        const w = baseProportionalSize * item.scale * item.aspectRatio;
                        const h = baseProportionalSize * item.scale;
                        const scaleXRaw = item.scaleX || 1;
                        const scaleX = Math.abs(scaleXRaw);

                        // Check if it has perspective warp
                        const hasPerspective = item.perspective && (
                            item.perspective.tl.x !== 0 || item.perspective.tl.y !== 0 ||
                            item.perspective.tr.x !== 0 || item.perspective.tr.y !== 0 ||
                            item.perspective.bl.x !== 0 || item.perspective.bl.y !== 0 ||
                            item.perspective.br.x !== 0 || item.perspective.br.y !== 0
                        );

                        let corners: { x: number, y: number }[] = [];

                        if (hasPerspective && item.perspective) {
                            const p = item.perspective;
                            const px_tl_x = (p.tl.x / 100) * w; const px_tl_y = (p.tl.y / 100) * h;
                            const px_tr_x = (p.tr.x / 100) * w; const px_tr_y = (p.tr.y / 100) * h;
                            const px_br_x = (p.br.x / 100) * w; const px_br_y = (p.br.y / 100) * h;
                            const px_bl_x = (p.bl.x / 100) * w; const px_bl_y = (p.bl.y / 100) * h;

                            // Local corners (unrotated, including scaleX)
                            const lx0 = (-w / 2 + px_tl_x) * scaleX; const ly0 = -h / 2 + px_tl_y;
                            const lx1 = (w / 2 + px_tr_x) * scaleX; const ly1 = -h / 2 + px_tr_y;
                            const lx2 = (w / 2 + px_br_x) * scaleX; const ly2 = h / 2 + px_br_y;
                            const lx3 = (-w / 2 + px_bl_x) * scaleX; const ly3 = h / 2 + px_bl_y;

                            const rot = (x: number, y: number, angleDeg: number) => {
                                const rad = (angleDeg * Math.PI) / 180;
                                return {
                                    x: x * Math.cos(rad) - y * Math.sin(rad),
                                    y: x * Math.sin(rad) + y * Math.cos(rad)
                                };
                            };

                            const r = item.rotation;
                            const p0 = rot(lx0, ly0, r);
                            const p1 = rot(lx1, ly1, r);
                            const p2 = rot(lx2, ly2, r);
                            const p3 = rot(lx3, ly3, r);

                            corners = [
                                { x: cx + p0.x, y: cy + p0.y },
                                { x: cx + p1.x, y: cy + p1.y },
                                { x: cx + p2.x, y: cy + p2.y },
                                { x: cx + p3.x, y: cy + p3.y }
                            ];
                        } else {
                            // Standard rotated rectangle
                            const rot = (x: number, y: number, angleDeg: number) => {
                                const rad = (angleDeg * Math.PI) / 180;
                                return {
                                    x: x * Math.cos(rad) - y * Math.sin(rad),
                                    y: x * Math.sin(rad) + y * Math.cos(rad)
                                };
                            };

                            const r = item.rotation;
                            const p0 = rot((-w / 2) * scaleX, -h / 2, r);
                            const p1 = rot((w / 2) * scaleX, -h / 2, r);
                            const p2 = rot((w / 2) * scaleX, h / 2, r);
                            const p3 = rot((-w / 2) * scaleX, h / 2, r);

                            corners = [
                                { x: cx + p0.x, y: cy + p0.y },
                                { x: cx + p1.x, y: cy + p1.y },
                                { x: cx + p2.x, y: cy + p2.y },
                                { x: cx + p3.x, y: cy + p3.y }
                            ];
                        }

                        // CONSERVATIVE EXPANSION (1.05x)
                        // This covers the frame but avoids eating into the surrounding context too much.
                        const expansion = 1.05;
                        const expandedCorners = corners.map(c => ({
                            x: cx + (c.x - cx) * expansion,
                            y: cy + (c.y - cy) * expansion
                        }));

                        // Draw the polygon
                        ctx.beginPath();
                        ctx.moveTo(expandedCorners[0].x, expandedCorners[0].y);
                        ctx.lineTo(expandedCorners[1].x, expandedCorners[1].y);
                        ctx.lineTo(expandedCorners[2].x, expandedCorners[2].y);
                        ctx.lineTo(expandedCorners[3].x, expandedCorners[3].y);
                        ctx.closePath();
                        ctx.fill();

                        ctx.restore();
                    }

                    const result = canvas.toDataURL('image/jpeg', 0.95);
                    resolve(result.split(',')[1]);
                } else {
                    resolve(baseImageBase64);
                }
            };

            img.onerror = () => {
                console.error("Failed to load base image for processing");
                resolve(baseImageBase64);
            };

            img.src = src;
        });
    }
}

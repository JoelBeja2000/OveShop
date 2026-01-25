
import { PlacedItem } from "../../domain/types";

export class CanvasCollageAdapter {

    async generateCollageBlob(backgroundImage: string, placedItems: PlacedItem[], transparentBackground: boolean = false): Promise<string> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx || !backgroundImage) return resolve('');

            const bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.onload = async () => {
                canvas.width = bgImg.width;
                canvas.height = bgImg.height;

                if (!transparentBackground) {
                    ctx.drawImage(bgImg, 0, 0);
                } else {
                    // Start from empty (transparent)
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }

                const baseProportionalSize = canvas.height * 0.35;

                for (const item of placedItems) {
                    await new Promise((resolveImg) => {
                        const itemImg = new Image();
                        itemImg.crossOrigin = "anonymous";
                        itemImg.onload = () => {
                            const hasPerspective = item.perspective && (
                                item.perspective.tl.x !== 0 || item.perspective.tl.y !== 0 ||
                                item.perspective.tr.x !== 0 || item.perspective.tr.y !== 0 ||
                                item.perspective.bl.x !== 0 || item.perspective.bl.y !== 0 ||
                                item.perspective.br.x !== 0 || item.perspective.br.y !== 0
                            );

                            if (hasPerspective && item.perspective) {
                                // PERSPECTIVE DRAWING
                                ctx.save();
                                ctx.filter = `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`;

                                const baseW = baseProportionalSize * item.scale * item.aspectRatio;
                                const baseH = baseProportionalSize * item.scale;
                                const cx = (item.x / 100) * canvas.width;
                                const cy = (item.y / 100) * canvas.height;

                                // Rotation logic for perspective points
                                // Visual points are relative to the rotatad box. 
                                // We need to map: 0,0 (top-left of image) -> P0 (warped TL)
                                const w = baseW;
                                const h = baseH;

                                // Calculate the visual corners based on the CSS-like transform logic
                                // But simpler: The user sees the perspective applied relative to the unrotated quad, 
                                // then the whole thing is rotated?
                                // Let's look at CameraCapture logic:
                                // transform: rotate(deg) scale(s) -> Then inside is the warp.
                                // So we must:
                                // 1. Calculate the 4 corner offsets in pixels relative to center

                                const p = item.perspective!;
                                const px_tl_x = (p.tl.x / 100) * w; const px_tl_y = (p.tl.y / 100) * h;
                                const px_tr_x = (p.tr.x / 100) * w; const px_tr_y = (p.tr.y / 100) * h;
                                const px_br_x = (p.br.x / 100) * w; const px_br_y = (p.br.y / 100) * h;
                                const px_bl_x = (p.bl.x / 100) * w; const px_bl_y = (p.bl.y / 100) * h;

                                // Local coordinates of corners (unrotated, centered at 0,0)
                                const x0 = -w / 2 + px_tl_x; const y0 = -h / 2 + px_tl_y; // TL
                                const x1 = w / 2 + px_tr_x; const y1 = -h / 2 + px_tr_y; // TR
                                const x2 = w / 2 + px_br_x; const y2 = h / 2 + px_br_y;  // BR
                                const x3 = -w / 2 + px_bl_x; const y3 = h / 2 + px_bl_y;  // BL

                                // Function to rotate a point
                                const rot = (x: number, y: number, angleDeg: number) => {
                                    const rad = (angleDeg * Math.PI) / 180;
                                    return {
                                        x: x * Math.cos(rad) - y * Math.sin(rad),
                                        y: x * Math.sin(rad) + y * Math.cos(rad)
                                    };
                                };

                                const r = item.rotation;
                                const p0 = rot(x0, y0, r);
                                const p1 = rot(x1, y1, r);
                                const p2 = rot(x2, y2, r);
                                const p3 = rot(x3, y3, r);

                                // Absolute canvas coordinates
                                const corners = [
                                    { x: cx + p0.x, y: cy + p0.y }, // TL
                                    { x: cx + p1.x, y: cy + p1.y }, // TR
                                    { x: cx + p2.x, y: cy + p2.y }, // BR
                                    { x: cx + p3.x, y: cy + p3.y }  // BL
                                ];

                                // Helper to draw textured triangle
                                // Implementation of affine texture mapping
                                const drawTriangle = (
                                    ctx: CanvasRenderingContext2D,
                                    im: HTMLImageElement,
                                    x0: number, y0: number, x1: number, y1: number, x2: number, y2: number,
                                    sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number
                                ) => {
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.moveTo(x0, y0);
                                    ctx.lineTo(x1, y1);
                                    ctx.lineTo(x2, y2);
                                    ctx.closePath();
                                    ctx.clip();

                                    // Affine transform to map (sx,sy) -> (x,y)
                                    // Solved via linear algebra
                                    const denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
                                    if (denom === 0) { ctx.restore(); return; }

                                    const m11 = - (sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
                                    const m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
                                    const m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
                                    const m22 = - (sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
                                    const dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
                                    const dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;

                                    ctx.transform(m11, m12, m21, m22, dx, dy);
                                    ctx.drawImage(im, 0, 0);
                                    ctx.restore();
                                };

                                // Draw 2 triangles
                                // Tri 1: TL, TR, BR
                                drawTriangle(
                                    ctx, itemImg,
                                    corners[0].x, corners[0].y, corners[1].x, corners[1].y, corners[2].x, corners[2].y,
                                    0, 0, itemImg.width, 0, itemImg.width, itemImg.height
                                );
                                // Tri 2: TL, BR, BL
                                drawTriangle(
                                    ctx, itemImg,
                                    corners[0].x, corners[0].y, corners[2].x, corners[2].y, corners[3].x, corners[3].y,
                                    0, 0, itemImg.width, itemImg.height, 0, itemImg.height
                                );

                                ctx.restore();

                            } else {
                                // STANDARD DRAWING
                                ctx.save();
                                const realX = (item.x / 100) * canvas.width;
                                const realY = (item.y / 100) * canvas.height;
                                ctx.translate(realX, realY);
                                ctx.rotate((item.rotation * Math.PI) / 180);
                                ctx.scale(item.scaleX || 1, 1);

                                const drawW = baseProportionalSize * item.scale * item.aspectRatio;
                                const drawH = baseProportionalSize * item.scale;

                                ctx.filter = `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`;
                                ctx.drawImage(itemImg, -drawW / 2, -drawH / 2, drawW, drawH);
                                ctx.restore();
                            }
                            resolveImg(null);
                        };
                        itemImg.src = item.image;
                    });
                }
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            bgImg.src = backgroundImage;
        });
    }
}

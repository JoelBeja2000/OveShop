
import { PlacedItem } from "../../domain/types";

export class CanvasCollageAdapter {

    async generateCollageBlob(
        backgroundImage: string | null, 
        placedItems: PlacedItem[], 
        transparentBackground: boolean = false,
        sceneResolution?: { w: number, h: number } | null,
        sceneBgColor?: string
    ): Promise<string> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve('');

            const finish = () => {
                const mime = transparentBackground ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(mime, 0.95));
            };

            const startRendering = async () => {
                const baseProportionalSize = canvas.height * 0.35;

                for (const item of placedItems) {
                    if (item.drawingStrokes && item.drawingStrokes.length > 0) {
                        // RENDER DRAWING STROKES
                        ctx.save();
                        const realX = (item.x / 100) * canvas.width;
                        const realY = (item.y / 100) * canvas.height;
                        const w = item.drawingBounds?.width ? (item.drawingBounds.width / 100) * canvas.width : (baseProportionalSize * item.scale * item.aspectRatio);
                        const h = item.drawingBounds?.height ? (item.drawingBounds.height / 100) * canvas.height : (baseProportionalSize * item.scale);
                        
                        ctx.translate(realX, realY);
                        ctx.rotate((item.rotation * Math.PI) / 180);
                        ctx.scale(item.scaleX || 1, 1);
                        
                        // Draw strokes in local box coords (-w/2, -h/2 to w/2, h/2)
                        item.drawingStrokes.forEach(stroke => {
                            stroke.segments.forEach(seg => {
                                ctx.beginPath();
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.strokeStyle = seg.color;
                                ctx.lineWidth = (seg.width / 100) * Math.max(w, h); // Approximate
                                ctx.globalAlpha = seg.opacity || 1;
                                
                                // Stroke bounds in local pixel space
                                const bw_px = item.drawingBounds?.width ? (item.drawingBounds.width / 100) * 1000 : w;
                                const bh_px = item.drawingBounds?.height ? (item.drawingBounds.height / 100) * (1000 / (item.aspectRatio || 1)) : h;
                                
                                seg.points.forEach((p, i) => {
                                    // p is in local pixel space (0 to bw_px, 0 to bh_px)
                                    // Map to -w/2..w/2 local box
                                    const lx = (p.x / bw_px) * w - w / 2;
                                    const ly = (p.y / bh_px) * h - h / 2;
                                    if (i === 0) ctx.moveTo(lx, ly);
                                    else ctx.lineTo(lx, ly);
                                });
                                ctx.stroke();
                            });
                        });
                        ctx.restore();
                    } else if (item.image) {
                        // RENDER IMAGE ASSET
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
                                    // PERSPECTIVE DRAWING (existing logic...)
                                    ctx.save();
                                    ctx.filter = `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`;
                                    const baseW = baseProportionalSize * item.scale * item.aspectRatio;
                                    const baseH = baseProportionalSize * item.scale;
                                    const cx = (item.x / 100) * canvas.width;
                                    const cy = (item.y / 100) * canvas.height;
                                    const w = baseW; const h = baseH;
                                    const p = item.perspective!;
                                    const px_tl_x = (p.tl.x / 100) * w; const px_tl_y = (p.tl.y / 100) * h;
                                    const px_tr_x = (p.tr.x / 100) * w; const px_tr_y = (p.tr.y / 100) * h;
                                    const px_br_x = (p.br.x / 100) * w; const px_br_y = (p.br.y / 100) * h;
                                    const px_bl_x = (p.bl.x / 100) * w; const px_bl_y = (p.bl.y / 100) * h;
                                    const x0 = -w / 2 + px_tl_x; const y0 = -h / 2 + px_tl_y;
                                    const x1 = w / 2 + px_tr_x; const y1 = -h / 2 + px_tr_y;
                                    const x2 = w / 2 + px_br_x; const y2 = h / 2 + px_br_y;
                                    const x3 = -w / 2 + px_bl_x; const y3 = h / 2 + px_bl_y;
                                    const rot = (x: number, y: number, angleDeg: number) => {
                                        const rad = (angleDeg * Math.PI) / 180;
                                        return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
                                    };
                                    const r = item.rotation;
                                    const corners = [rot(x0, y0, r), rot(x1, y1, r), rot(x2, y2, r), rot(x3, y3, r)]
                                        .map(p => ({ x: cx + p.x, y: cy + p.y }));
                                    
                                    const drawTriangle = (ctx: CanvasRenderingContext2D, im: HTMLImageElement, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number) => {
                                        ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.clip();
                                        const denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
                                        if (denom !== 0) {
                                            const m11 = - (sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
                                            const m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
                                            const m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
                                            const m22 = - (sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
                                            const dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
                                            const dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;
                                            ctx.transform(m11, m12, m21, m22, dx, dy); ctx.drawImage(im, 0, 0);
                                        }
                                        ctx.restore();
                                    };
                                    drawTriangle(ctx, itemImg, corners[0].x, corners[0].y, corners[1].x, corners[1].y, corners[2].x, corners[2].y, 0, 0, itemImg.width, 0, itemImg.width, itemImg.height);
                                    drawTriangle(ctx, itemImg, corners[0].x, corners[0].y, corners[2].x, corners[2].y, corners[3].x, corners[3].y, 0, 0, itemImg.width, itemImg.height, 0, itemImg.height);
                                    ctx.restore();
                                } else {
                                    // STANDARD
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
                            itemImg.onerror = () => resolveImg(null);
                            itemImg.src = item.image;
                        });
                    }
                }
                finish();
            };

            if (backgroundImage) {
                const bgImg = new Image();
                bgImg.crossOrigin = "anonymous";
                bgImg.onload = () => {
                    canvas.width = bgImg.width;
                    canvas.height = bgImg.height;
                    if (!transparentBackground) ctx.drawImage(bgImg, 0, 0);
                    else ctx.clearRect(0, 0, canvas.width, canvas.height);
                    startRendering();
                };
                bgImg.onerror = () => resolve('');
                bgImg.src = backgroundImage;
            } else if (sceneResolution) {
                canvas.width = sceneResolution.w;
                canvas.height = sceneResolution.h;
                if (!transparentBackground) {
                    ctx.fillStyle = sceneBgColor || '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                startRendering();
            } else {
                resolve('');
            }
        });
    }
}


import { PlacedItem } from "../../domain/types";

export class CanvasCollageAdapter {

    async generateCollageBlob(backgroundImage: string, placedItems: PlacedItem[]): Promise<string> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx || !backgroundImage) return resolve('');

            const bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.onload = async () => {
                canvas.width = bgImg.width;
                canvas.height = bgImg.height;
                ctx.drawImage(bgImg, 0, 0);

                const baseProportionalSize = canvas.height * 0.35;

                for (const item of placedItems) {
                    await new Promise((resolveImg) => {
                        const itemImg = new Image();
                        itemImg.crossOrigin = "anonymous";
                        itemImg.onload = () => {
                            ctx.save();
                            const realX = (item.x / 100) * canvas.width;
                            const realY = (item.y / 100) * canvas.height;
                            ctx.translate(realX, realY);
                            ctx.rotate((item.rotation * Math.PI) / 180);

                            const drawW = baseProportionalSize * item.scale * item.aspectRatio;
                            const drawH = baseProportionalSize * item.scale;

                            ctx.filter = `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`;
                            ctx.drawImage(itemImg, -drawW / 2, -drawH / 2, drawW, drawH);
                            ctx.restore();
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

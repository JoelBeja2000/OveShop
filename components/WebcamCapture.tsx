
import React, { useRef, useState, useEffect } from 'react';

interface WebcamCaptureProps {
    onCapture: (imageData: string) => void;
    onClose: () => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
                console.error("Error accessing camera:", err);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                onCapture(imageData);
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {error ? (
                    <div className="flex items-center justify-center h-full text-white/50">
                        <p>{error}</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                    <button
                        onClick={handleCapture}
                        disabled={!!error}
                        className="h-14 w-14 rounded-full border-4 border-white flex items-center justify-center hover:scale-110 transition-transform active:scale-95 bg-white/10 backdrop-blur-sm"
                    >
                        <div className="w-10 h-10 bg-white rounded-full"></div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebcamCapture;

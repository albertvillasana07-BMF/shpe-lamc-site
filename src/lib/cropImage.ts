export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = src;
  });
}

/**
 * Crops `imageSrc` down to `cropAreaPixels` (as reported by react-easy-crop's
 * onCropComplete) and resolves with a JPEG Blob ready to upload.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropAreaPixels: CropArea,
  mimeType: string = "image/jpeg",
  quality: number = 0.85,
  maxSize: number = 1600
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  // Shrink big phone photos so pages load fast. 1600px is plenty for the site.
  const scale = Math.min(1, maxSize / Math.max(cropAreaPixels.width, cropAreaPixels.height));
  const outW = Math.round(cropAreaPixels.width * scale);
  const outH = Math.round(cropAreaPixels.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      mimeType,
      quality
    );
  });
}
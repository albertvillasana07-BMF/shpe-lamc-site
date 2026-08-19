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
  quality: number = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = cropAreaPixels.width;
  canvas.height = cropAreaPixels.height;
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
    cropAreaPixels.width,
    cropAreaPixels.height
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
const MAX_INLINE_IMAGE_BYTES = 650 * 1024;
const MAX_IMAGE_SIDE = 1400;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image.'));
    image.src = src;
  });
}

function dataUrlByteSize(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

export async function createInlineProjectImage(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  let scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  let quality = 0.82;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image canvas.');

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const output = canvas.toDataURL('image/webp', quality);

    if (dataUrlByteSize(output) <= MAX_INLINE_IMAGE_BYTES) {
      return output;
    }

    quality = Math.max(0.52, quality - 0.08);
    scale *= 0.84;
  }

  throw new Error('Image is still too large after compression.');
}

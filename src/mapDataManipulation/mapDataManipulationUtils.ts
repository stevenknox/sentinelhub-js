import { Effects, ColorRange, ImageProperties } from './const';

export async function getImageData(originalBlob: Blob): Promise<ImageProperties> {
  let imgObjectUrl: any;
  try {
    const imgCanvas = document.createElement('canvas');
    const imgCtx = imgCanvas.getContext('2d');
    imgObjectUrl = window.URL.createObjectURL(originalBlob);
    const img: any = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imgObjectUrl;
    });

    imgCanvas.width = img.width;
    imgCanvas.height = img.height;
    imgCtx.drawImage(img, 0, 0);
    const imgData = imgCtx.getImageData(0, 0, img.width, img.height).data;
    imgCanvas.remove();

    return { rgba: imgData, width: img.width, height: img.height, format: originalBlob.type };
  } catch (e) {
    console.error(e);
    return { rgba: new Uint8ClampedArray(), width: 0, height: 0, format: '' };
  } finally {
    if (imgObjectUrl) {
      window.URL.revokeObjectURL(imgObjectUrl);
    }
  }
}

export async function getBlob(imageProperties: ImageProperties): Promise<Blob> {
  const { rgba, width, height, format } = imageProperties;
  let imgObjectUrl: any;
  try {
    const imgCanvas = document.createElement('canvas');
    imgCanvas.width = width;
    imgCanvas.height = height;
    const imgCtx = imgCanvas.getContext('2d');
    const newImg = new ImageData(rgba, width, height);
    imgCtx.putImageData(newImg, 0, 0);
    const blob: Blob = await new Promise(resolve => {
      imgCanvas.toBlob(blob => {
        resolve(blob);
      }, format);
    });
    imgCanvas.remove();
    return blob;
  } catch (e) {
    console.error(e);
  } finally {
    if (imgObjectUrl) {
      window.URL.revokeObjectURL(imgObjectUrl);
    }
  }
}

// from one range to another
// f(x) = c + ((d - c) / (b - a)) * (x - a)
// a = oldMin, b = oldMax; c = newMin, d = newMax
// [0,255] to [0,1]: a = 0, b = 255; c = 0, d = 1
// [0,1] to [0,255]: a = 0, b = 1; c = 0, d = 255

export function transformValueToRange(
  x: number,
  oldMin: number,
  oldMax: number,
  newMin: number,
  newMax: number,
): number {
  let newX = newMin + ((newMax - newMin) / (oldMax - oldMin)) * (x - oldMin);
  newX = Math.max(newX, newMin);
  newX = Math.min(newX, newMax);
  return newX;
}

export function isEffectSet(effect: number | ColorRange | Function): boolean {
  return effect !== undefined && effect !== null;
}

export function isAnyEffectSet(effects: Effects): boolean {
  return Object.values(effects).some(e => isEffectSet(e));
}

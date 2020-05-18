import { RgbMappingArrays } from 'src/mapDataManipulation/const';

export function prepareRgbMappingArrays(): RgbMappingArrays {
  return {
    red: [...Array(256).keys()],
    green: [...Array(256).keys()],
    blue: [...Array(256).keys()],
  };
}

// from one interval to another
// f(x) = c + ((d - c) / (b - a)) * (x - a)
// a = oldMin, b = oldMax; c = newMin, d = newMax
// [0,255] to [0,1]: a = 0, b = 255; c = 0, d = 1
// [0,1] to [0,255]: a = 0, b = 1; c = 0, d = 255

export function changeRgbMappingArraysInterval(
  rgbMappingArrays: RgbMappingArrays,
  oldMin: number,
  oldMax: number,
  newMin: number,
  newMax: number,
  strictlyLimitValuesToInterval: boolean = false,
): RgbMappingArrays {
  const transformValueToInterval = (x: number): number => {
    let newX = newMin + ((newMax - newMin) / (oldMax - oldMin)) * (x - oldMin);
    if (strictlyLimitValuesToInterval) {
      newX = Math.max(newX, newMin);
      newX = Math.min(newX, newMax);
    }
    return newX;
  };

  rgbMappingArrays.red = rgbMappingArrays.red.map(x => transformValueToInterval(x));
  rgbMappingArrays.green = rgbMappingArrays.green.map(x => transformValueToInterval(x));
  rgbMappingArrays.blue = rgbMappingArrays.blue.map(x => transformValueToInterval(x));
  return rgbMappingArrays;
}

export function prepareManipulatePixel(rgbMappingArrays: RgbMappingArrays): any {
  return function(r: number, g: number, b: number, a: number): object {
    return { r: rgbMappingArrays.red[r], g: rgbMappingArrays.green[g], b: rgbMappingArrays.blue[b], a };
  };
}

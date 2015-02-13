
import NeuQuant from './neuquant';

// from https://github.com/sole/Animated_GIF/blob/master/src/Animated_GIF.worker.js
// optimized to avoid neuquantizing when the number of pixels is
// below the per-frame palette threshold

export default function process(imageData, width, height, sampleInterval) {
  var numberPixels = width * height;

  // optimization: try to avoid neuquantizing
  // if the palette fits in 256 colors
  {
    let i = 0;
    let length = width * height * 4;
    let palette = new Map;

    while(i < length){
      let r = imageData[i++];
      let g = imageData[i++];
      let b = imageData[i++];
      palette.set(r << 16 | g << 8 | b, true);
      i++;
    }

    if (palette.size <= 256) {
      let paletteArray = Array.from(palette.keys());
      paletteArray.length = 256;
      let pixels = new Uint8Array(numberPixels);
      let p = 0;
      let k = 0;

      // produced indexed pixels array
      while(k < length) {
        let r = imageData[k++];
        let g = imageData[k++];
        let b = imageData[k++];
        let index = r << 16 | g << 8 | b;
        pixels[p] = paletteArray.indexOf(index);
        k++; p++;
      }

      return {
        pixels: pixels,
        palette: new Uint32Array(paletteArray)
      };
    }
  }

  var rgbComponents = toRGB( imageData, width, height );
  var nq = new NeuQuant(rgbComponents, rgbComponents.length, sampleInterval);
  var paletteRGB = nq.process();
  var paletteArray = new Uint32Array(componentizedPaletteToArray(paletteRGB));
  var indexedPixels = new Uint8Array(numberPixels);
  var k = 0;

  for (var i = 0; i < numberPixels; i++) {
    var r = rgbComponents[k++];
    var g = rgbComponents[k++];
    var b = rgbComponents[k++];
    indexedPixels[i] = nq.map(r, g, b);
  }

  return {
    pixels: indexedPixels,
    palette: paletteArray
  };
}

function toRGB(data, width, height) {
  var i = 0;
  var length = width * height * 4;
  var rgb = [];

  while(i < length) {
    rgb.push( data[i++] );
    rgb.push( data[i++] );
    rgb.push( data[i++] );
    i++; // for the alpha channel which we don't care about
  }

  return rgb;
}

function componentizedPaletteToArray(paletteRGB) {
  var paletteArray = [];

  for(var i = 0; i < paletteRGB.length; i += 3) {
    var r = paletteRGB[ i ];
    var g = paletteRGB[ i + 1 ];
    var b = paletteRGB[ i + 2 ];
    paletteArray.push(r << 16 | g << 8 | b);
  }

  return paletteArray;
}


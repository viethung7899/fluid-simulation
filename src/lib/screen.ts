export const useScreen = (canvas: HTMLCanvasElement) => {

  canvas.width =  window.innerWidth;
  canvas.height = window.innerHeight;

  let adjustedWidth = canvas.width;
  let adjustedHeight = canvas.height;

  window.onresize = () => {
    adjustedWidth = window.innerWidth;
    adjustedHeight = window.innerHeight;
  }

  return {
    get currentWidth() {
      return canvas.width;
    },
    get currentHeight() {
      return canvas.height;
    },
    get adjustedWidth() {
      return adjustedWidth;
    },
    get adjustedHeight() {
      return adjustedHeight;
    },
    updateSize() {
      canvas.width = adjustedWidth;
      canvas.height = adjustedHeight;
    },
    hasChangedSize() {
      return canvas.width !== adjustedWidth || canvas.height !== adjustedHeight;
    }

  }
}

export type Screen = ReturnType<typeof useScreen>;
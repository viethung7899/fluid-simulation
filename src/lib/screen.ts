export const useScreen = (canvas: HTMLCanvasElement) => {
  let currentWidth = window.innerWidth;
  let currentHeight = window.innerHeight;
  let adjustedWidth = currentWidth;
  let adjustedHeight = currentHeight;

  canvas.width = currentWidth;
  canvas.height = currentHeight;

  window.onresize = () => {
    adjustedWidth = window.innerWidth;
    adjustedHeight = window.innerHeight;
  }

  return {
    get currentWidth() {
      return currentWidth;
    },
    get currentHeight() {
      return currentHeight;
    },
    get adjustedWidth() {
      return adjustedWidth;
    },
    get adjustedHeight() {
      return adjustedHeight;
    },
    updateSize() {
      currentWidth = adjustedWidth;
      currentHeight = adjustedHeight;
    },
    hasChangedSize() {
      return currentWidth !== adjustedWidth || currentHeight !== adjustedHeight;
    }

  }
}

export type Screen = ReturnType<typeof useScreen>;
export const useMouse = (element: HTMLElement) => {
  let isPointerDown = false;
  let position = new Float32Array([0, 0]);

  element.addEventListener("pointerdown", () => {
    isPointerDown = true;
  });

  element.addEventListener("pointerup", () => {
    isPointerDown = false;
  });

  element.addEventListener("pointermove", (event) => {
    position[0] = event.clientX / element.clientWidth;
    position[1] = event.clientY / element.clientHeight;
  });

  element.addEventListener("pointerleave", () => {
    position[0] = 0;
    position[1] = 0;
  });

  return {
    get isPointerDown() {
      return isPointerDown;
    },
    get position() {
      return position;
    },
  }



}


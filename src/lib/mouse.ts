export const useMouse = (element: HTMLCanvasElement) => {
  let isPointerDown = false;
  let position = new Float32Array([0, 0]);
  let movement = new Float32Array([0, 0]);

  element.addEventListener("pointerdown", () => {
    isPointerDown = true;
  });

  element.addEventListener("pointerup", () => {
    isPointerDown = false;
  });

  element.addEventListener("pointermove", (event) => {
    position[0] = event.offsetX / element.width;
    position[1] = event.offsetY / element.height;
    movement[0] = event.movementX / element.width;
    movement[1] = event.movementY / element.height;
  });

  element.addEventListener("pointerleave", () => {
    position[0] = 0;
    position[1] = 0;
    movement[0] = 0;
    movement[1] = 0;
  });

  return {
    get isPointerDown() {
      return isPointerDown;
    },
    get position() {
      return position;
    },
    get movement() {
      return movement;
    },
    get data() {
      return new Float32Array([...position, ...movement]);
    }
  }
}


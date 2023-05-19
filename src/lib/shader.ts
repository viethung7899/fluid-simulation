import screenShader from "../shaders/screen.wgsl?raw";
import splatShader from "../shaders/splat.wgsl?raw";
import displayShader from "../shaders/display.wgsl?raw";

export const makeShaderModules = (device: GPUDevice) => {
  const createShader = (code: string, label?: string) => {
    return device.createShaderModule({
      label,
      code,
    });
  }

  return {
    screen: createShader(screenShader, "Screen shader"),
    splat: createShader(splatShader, "Color shader"),
    display: createShader(displayShader, "Display shader"),
  }
}
import combineShader from "../shaders/combine.wgsl?raw";
import displayShader from "../shaders/display.wgsl?raw";
import screenShader from "../shaders/screen.wgsl?raw";
import simulationShader from "../shaders/simulation.wgsl?raw";
import splatShader from "../shaders/splat.wgsl?raw";

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
    simulation: createShader(simulationShader, "Simulation shader"),
    combine: createShader(combineShader, "Combine shader"),
  }
}
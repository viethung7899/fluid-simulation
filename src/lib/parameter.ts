import { Pane } from 'tweakpane';

export const RADIUS = 0.25;
export const FORCE_FACTOR = 6000;
export const VORTICITY = 30;
export const PRESSURE = 0.8;
export const PRESSURE_ITERATIONS = 20;
export const VELOCITY_DIFFUSION = 0.2;
export const DENSITY_DIFFUSION = 1;
export const RESOLUTION = 128;

export const makeController = () => {
  let parameters = {
    radius: RADIUS,
    forceFactor: FORCE_FACTOR,
    vorticity: VORTICITY,
    pressure: PRESSURE,
    pressureIterations: PRESSURE_ITERATIONS,
    velocityDiffusion: VELOCITY_DIFFUSION,
    densityDiffusion: DENSITY_DIFFUSION,
  }

  const pane = new Pane({
    title: 'Fluid simulation',
  });
  const radius = pane.addInput(parameters, 'radius', {
    min: 0.01,
    max: 1,
    step: 0.01,
  })
  radius.on("change", (event) => parameters.radius = event.value);

  const forceFactor = pane.addInput(parameters, 'forceFactor', {
    min: 1000,
    max: 10000,
    step: 50,
    label: "force factor"
  })
  forceFactor.on("change", (event) => parameters.forceFactor = event.value);

  const vorticity = pane.addInput(parameters, 'vorticity', {
    min: 0,
    max: 50,
    step: 1,
  })
  vorticity.on("change", (event) => parameters.vorticity = event.value);

  const pressure = pane.addInput(parameters, 'pressure', {
    min: 0,
    max: 1,
    step: 0.01,
  })
  pressure.on("change", (event) => parameters.pressure = event.value);

  const pressureIterations = pane.addInput(parameters, 'pressureIterations', {
    min: 1,
    max: 20,
    step: 1,
    label: "pressure iterations"
  })
  pressureIterations.on("change", (event) => parameters.pressureIterations = event.value);

  const velocityDiffusion = pane.addInput(parameters, 'velocityDiffusion', {
    min: 0,
    max: 4,
    step: 0.01,
    label: "velocity diffusion"
  })
  velocityDiffusion.on("change", (event) => parameters.velocityDiffusion = event.value);

  const densityDiffusion = pane.addInput(parameters, 'densityDiffusion', {
    min: 0,
    max: 4,
    step: 0.01,
    label: "density diffusion"
  })
  densityDiffusion.on("change", (event) => parameters.densityDiffusion = event.value);

  return parameters;
}
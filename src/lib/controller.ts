import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { Pane } from 'tweakpane';

const RADIUS = 0.25;
const FORCE_FACTOR = 6000;
const VORTICITY = 30;
const PRESSURE = 0.8;
const PRESSURE_ITERATIONS = 20;
const VELOCITY_DIFFUSION = 0.2;
const DENSITY_DIFFUSION = 1;
export const RESOLUTION = 128;

const LINK = "https://github.com/viethung7899/fluid-simulation";

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

  pane.registerPlugin(EssentialsPlugin);

  pane.addInput(parameters, 'radius', {
    min: 0.01,
    max: 1,
    step: 0.01,
  }).on("change", (event) => parameters.radius = event.value);

  pane.addInput(parameters, 'forceFactor', {
    min: 1000,
    max: 10000,
    step: 50,
    label: "force factor"
  }).on("change", (event) => parameters.forceFactor = event.value);

  pane.addInput(parameters, 'vorticity', {
    min: 0,
    max: 50,
    step: 1,
  }).on("change", (event) => parameters.vorticity = event.value);

  pane.addInput(parameters, 'pressure', {
    min: 0,
    max: 1,
    step: 0.01,
  }).on("change", (event) => parameters.pressure = event.value);

  pane.addInput(parameters, 'pressureIterations', {
    min: 1,
    max: 20,
    step: 1,
    label: "pressure iterations"
  }).on("change", (event) => parameters.pressureIterations = event.value);

  pane.addInput(parameters, 'velocityDiffusion', {
    min: 0,
    max: 4,
    step: 0.01,
    label: "velocity diffusion"
  }).on("change", (event) => parameters.velocityDiffusion = event.value);

  pane.addInput(parameters, 'densityDiffusion', {
    min: 0,
    max: 4,
    step: 0.01,
    label: "density diffusion"
  }).on("change", (event) => parameters.densityDiffusion = event.value);

  pane.addSeparator();
  const fpsGraph = pane.addBlade({
    view: 'fpsgraph',
    label: 'frame rate',
    lineCount: 2,
  }) as any;


  pane.addSeparator();
  pane.addButton({
    title: "View source code",
  }).on("click", () => {
    window.open(LINK, "_blank");
  });

  return { parameters, fpsGraph };
}
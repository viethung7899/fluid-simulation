import { makeUniformBuffers } from "./lib/buffer";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import { DELTA, FORCE_FACTOR, PRESSURE, PRESSURE_ITERATIONS, RADIUS, VELOCITY_DIFFUSION, VORTICITY } from "./lib/parameter";
import { makeShaderModules } from "./lib/shader";
import { createVertexBuffer } from "./lib/vertices";

const WIDTH = 800;
const HEIGHT = 600;
const ASPECT_RATIO = WIDTH / HEIGHT;
const SIM_HEIGHT = 128;
const SIM_WIDTH = Math.floor(SIM_HEIGHT * ASPECT_RATIO);

const app = document.querySelector<HTMLCanvasElement>('#app')!;

app.width = WIDTH;
app.height = HEIGHT;
const { device, register } = await initalizeWebGPU();
const screen = register(app);
const mouse = useMouse(app);
const getDimension = () => new Float32Array([app.width, app.height]);
const getAspectRatio = () => app.width / app.height;
const shaders = makeShaderModules(device);

const sampler = device.createSampler({
  magFilter: "linear",
  minFilter: "linear",
});

const createSimulationTexture = (format?: GPUTextureFormat) => {
  return device.createTexture({
    size: [SIM_WIDTH, SIM_HEIGHT],
    format: format || "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
}

const createScreenTexture = (format?: GPUTextureFormat) => {
  return device.createTexture({
    size: [app.width, app.height],
    format: format || "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
}

// Create buffers
const { vertexBuffer, vertexBufferLayout, vertexCount } = createVertexBuffer(device);
const { buffers, layouts, bindGroups } = makeUniformBuffers(device);
const vertex = {
  module: shaders.screen,
  entryPoint: "main",
  buffers: [vertexBufferLayout],
}

// Write to buffres
device.queue.writeBuffer(buffers.dimension, 0, getDimension());
device.queue.writeBuffer(buffers.radius, 0, new Float32Array([RADIUS]));
device.queue.writeBuffer(buffers.parameter, 0, new Float32Array([DELTA, VORTICITY, PRESSURE, VELOCITY_DIFFUSION]));

// Texture bind groups
const createTextureBindGroup = (texture: GPUTexture) => {
  return device.createBindGroup({
    layout: layouts.binding.texture,
    entries: [{
      binding: 0,
      resource: sampler,
    }, {
      binding: 1,
      resource: texture.createView(),
    }]
  });
}

const createCombineTextureBindGroup = (source: GPUTexture, target: GPUTexture) => {
  return device.createBindGroup({
    layout: layouts.binding.doubleTextures,
    entries: [{
      binding: 0,
      resource: sampler,
    }, {
      binding: 1,
      resource: source.createView(),
    }, {
      binding: 2,
      resource: target.createView(),
    }]
  });
}

// Create simulations texture
// Begin state
const densityTexture = createSimulationTexture();
const velocityTexture = createSimulationTexture("rg16float");
const pressureTexture = createSimulationTexture("r16float");

// Middle state
const curlTexture = createSimulationTexture("r16float");
const divergenceTexture = createSimulationTexture("r16float");

// Procceced state
const processedVelocityTexture = createSimulationTexture("rg16float");
const processedPressureTexture = createSimulationTexture("r16float");
const processedDensityTexture = createSimulationTexture();

// Bind texture groups
const densityGroup = createTextureBindGroup(densityTexture);
const velocityGroup = createTextureBindGroup(velocityTexture);
const pressureGroup = createTextureBindGroup(pressureTexture);
const curlAndVelocityGroup = createCombineTextureBindGroup(curlTexture, velocityTexture);
const pressureAndDivergenceGroup = createCombineTextureBindGroup(pressureTexture, divergenceTexture);
const pressureAndVelocityGroup = createCombineTextureBindGroup(pressureTexture, velocityTexture);
const velocityCombineGroup = createCombineTextureBindGroup(velocityTexture, velocityTexture);
const densityAndVelocityGroup = createCombineTextureBindGroup(densityTexture, velocityTexture);

// Create pipelines
const splatDensityPipeline = device.createRenderPipeline({
  label: "Splat density pipeline",
  layout: device.createPipelineLayout({
    label: "Splat pipeline layout",
    bindGroupLayouts: [layouts.binding.dimension, layouts.binding.mouse, layouts.binding.texture],
  }),
  vertex,
  fragment: {
    module: shaders.splat,
    entryPoint: "main",
    targets: [{
      format: densityTexture.format,
    }],
  }
});


const splatVelocityPipeline = device.createRenderPipeline({
  label: "Splat velocity pipeline",
  layout: device.createPipelineLayout({
    label: "Screen pipeline layout",
    bindGroupLayouts: [layouts.binding.dimension, layouts.binding.mouse, layouts.binding.texture],
  }),
  vertex,
  fragment: {
    module: shaders.splat,
    entryPoint: "main",
    targets: [{
      format: velocityTexture.format,
    }],
  }
});

const screenPipeline = device.createRenderPipeline({
  label: "Screen pipeline",
  layout: device.createPipelineLayout({
    label: "Screen pipeline layout",
    bindGroupLayouts: [layouts.binding.texture],
  }),
  vertex,
  fragment: {
    module: shaders.display,
    entryPoint: "main",
    targets: [{
      format: screen.canvasFormat
    }]
  }
});

const simulationPipelineLayout = device.createPipelineLayout({
  label: "Simulation pipeline layout",
  bindGroupLayouts: [layouts.binding.dimension, layouts.binding.parameter, layouts.binding.texture],
})

const combinePipelineLayout = device.createPipelineLayout({
  label: "Simulation pipeline layout",
  bindGroupLayouts: [layouts.binding.dimension, layouts.binding.parameter, layouts.binding.doubleTextures],
})

const curlPipeline = device.createRenderPipeline({
  label: "Curl pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "curl",
    targets: [{ format: curlTexture.format }]
  }
});

const vorticityPipeline = device.createRenderPipeline({
  label: "Curl pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "vorticity",
    targets: [{ format: velocityTexture.format }]
  }
});

const divergencePipeline = device.createRenderPipeline({
  label: "Divergence pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "divergence",
    targets: [{ format: divergenceTexture.format }]
  }
});

const clearPressurePipeline = device.createRenderPipeline({
  label: "Clear pressure pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "clearPressure",
    targets: [{ format: pressureTexture.format }]
  }
});

const pressurePipeline = device.createRenderPipeline({
  label: "Clear pressure pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "pressure",
    targets: [{ format: pressureTexture.format }]
  }
});

const subtractPressurePipeline = device.createRenderPipeline({
  label: "Subtract pressure pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "subtractPressure",
    targets: [{ format: velocityTexture.format }]
  }
});

const advectVelocityPipeline = device.createRenderPipeline({
  label: "Advect velocity pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "advection",
    targets: [{ format: velocityTexture.format }]
  }
});

const advectDenistyPipeline = device.createRenderPipeline({
  label: "Advect velocity pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "advection",
    targets: [{ format: densityTexture.format }]
  }
});

// Make pass
const makeRenderPass = (encoder: GPUCommandEncoder, pipeline: GPURenderPipeline, target: GPUTexture) => {
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: target.createView(),
      loadOp: "clear",
      storeOp: "store",
    }]
  });
  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  return pass;
}

const displayGroup = createTextureBindGroup(velocityTexture);
const transferTexture = (encoder: GPUCommandEncoder, source: GPUTexture, target: GPUTexture) => {
  encoder.copyTextureToTexture(
    { texture: source },
    { texture: target },
    [target.width, target.height, 1]
  )
}

const render = () => {
  const encoder = device.createCommandEncoder();

  device.queue.writeBuffer(buffers.mouse, 0, mouse.position);

  const splatVelocityPass = makeRenderPass(encoder, splatVelocityPipeline, processedVelocityTexture);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(buffers.color, 0, new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]));
  splatVelocityPass.setBindGroup(0, bindGroups.dimension);
  splatVelocityPass.setBindGroup(1, bindGroups.mouse);
  splatVelocityPass.setBindGroup(2, velocityGroup);
  splatVelocityPass.draw(vertexCount);
  splatVelocityPass.end();

  transferTexture(encoder, processedVelocityTexture, velocityTexture);

  const curlPass = makeRenderPass(encoder, curlPipeline, curlTexture);
  curlPass.setBindGroup(0, bindGroups.dimension);
  curlPass.setBindGroup(1, bindGroups.parameter);
  curlPass.setBindGroup(2, velocityGroup);
  curlPass.draw(vertexCount);
  curlPass.end();

  const vorticityPass = makeRenderPass(encoder, vorticityPipeline, processedVelocityTexture);
  vorticityPass.setBindGroup(0, bindGroups.dimension);
  vorticityPass.setBindGroup(1, bindGroups.parameter);
  vorticityPass.setBindGroup(2, curlAndVelocityGroup);
  vorticityPass.draw(vertexCount);
  vorticityPass.end();

  transferTexture(encoder, processedVelocityTexture, velocityTexture);

  const divergencePass = makeRenderPass(encoder, divergencePipeline, divergenceTexture);
  divergencePass.setBindGroup(0, bindGroups.dimension);
  divergencePass.setBindGroup(1, bindGroups.parameter);
  divergencePass.setBindGroup(2, velocityGroup);
  divergencePass.draw(vertexCount);
  divergencePass.end();

  const clearPressurePass = makeRenderPass(encoder, clearPressurePipeline, processedPressureTexture);
  clearPressurePass.setBindGroup(0, bindGroups.dimension);
  clearPressurePass.setBindGroup(1, bindGroups.parameter);
  clearPressurePass.setBindGroup(2, pressureGroup);
  clearPressurePass.draw(vertexCount);
  clearPressurePass.end();

  transferTexture(encoder, processedPressureTexture, pressureTexture);

  for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
    const pressurePass = makeRenderPass(encoder, pressurePipeline, processedPressureTexture);
    pressurePass.setBindGroup(0, bindGroups.dimension);
    pressurePass.setBindGroup(1, bindGroups.parameter);
    pressurePass.setBindGroup(2, pressureAndDivergenceGroup);
    pressurePass.draw(vertexCount);
    pressurePass.end();
    transferTexture(encoder, processedPressureTexture, pressureTexture);
  }

  const subtractPressurePass = makeRenderPass(encoder, subtractPressurePipeline, processedVelocityTexture);
  subtractPressurePass.setBindGroup(0, bindGroups.dimension);
  subtractPressurePass.setBindGroup(1, bindGroups.parameter);
  subtractPressurePass.setBindGroup(2, pressureAndVelocityGroup);
  subtractPressurePass.draw(vertexCount);
  subtractPressurePass.end();

  transferTexture(encoder, processedVelocityTexture, velocityTexture);

  const advectVelocityPass = makeRenderPass(encoder, advectVelocityPipeline, processedVelocityTexture);
  advectVelocityPass.setBindGroup(0, bindGroups.dimension);
  advectVelocityPass.setBindGroup(1, bindGroups.parameter);
  advectVelocityPass.setBindGroup(2, velocityCombineGroup);
  advectVelocityPass.draw(vertexCount);
  advectVelocityPass.end();

  transferTexture(encoder, processedVelocityTexture, velocityTexture);

  // const advectDenistyPass = makeRenderPass(encoder, advectDenistyPipeline, processedDensityTexture);
  // advectDenistyPass.setBindGroup(0, bindGroups.dimension);
  // advectDenistyPass.setBindGroup(1, bindGroups.parameter);
  // advectDenistyPass.setBindGroup(2, densityAndVelocityGroup);
  // advectDenistyPass.draw(vertexCount);
  // advectDenistyPass.end();

  // transferTexture(encoder, processedDensityTexture, densityTexture);

  const screenPass = makeRenderPass(encoder, screenPipeline, screen.context.getCurrentTexture());
  screenPass.setBindGroup(0, displayGroup);
  screenPass.draw(vertexCount);
  screenPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
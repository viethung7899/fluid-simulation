import { makeUniformBuffers } from "./lib/buffer";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import { DELTA, DENSITY_DIFFUSION, FORCE_FACTOR, PRESSURE, PRESSURE_ITERATIONS, RADIUS, VELOCITY_DIFFUSION, VORTICITY } from "./lib/parameter";
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
const densityTexture = createScreenTexture();
const velocityTexture = createSimulationTexture("rg16float");
const pressureTexture = createSimulationTexture("r16float");

// Middle state
const curlTexture = createSimulationTexture("r16float");
const divergenceTexture = createSimulationTexture("r16float");

// Procceced state
const processedVelocityTexture: GPUTexture = createSimulationTexture("rg16float");
const processedPressureTexture = createSimulationTexture("r16float");
const processedDensityTexture = createScreenTexture();

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
  bindGroupLayouts: [layouts.binding.parameter, layouts.binding.texture],
})

const combinePipelineLayout = device.createPipelineLayout({
  label: "combine texture pipeline layout",
  bindGroupLayouts: [layouts.binding.parameter, layouts.binding.doubleTextures],
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

const transferTexture = (encoder: GPUCommandEncoder, source: GPUTexture, target: GPUTexture) => {
  encoder.copyTextureToTexture(
    { texture: source },
    { texture: target },
    [target.width, target.height, 1]
  )
}

const zero = new Float32Array([0, 0, 0]);
const dye = new Float32Array([0.1, 0, 0]);
const velocityParams = new Float32Array([DELTA, VORTICITY, PRESSURE, VELOCITY_DIFFUSION]);
const densityParams = new Float32Array([DELTA, VORTICITY, PRESSURE, DENSITY_DIFFUSION]);

const render = () => {
  device.queue.writeBuffer(buffers.dimension, 0, getDimension());
  device.queue.writeBuffer(buffers.radius, 0, new Float32Array([RADIUS]));
  device.queue.writeBuffer(buffers.mouse, 0, mouse.position);
  
  const velocityEncoder = device.createCommandEncoder();
  device.queue.writeBuffer(buffers.parameter, 0, velocityParams);


  const splatVelocityPass = makeRenderPass(velocityEncoder, splatVelocityPipeline, processedVelocityTexture);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(buffers.color, 0, mouse.isPointerDown ? new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]) : zero);
  splatVelocityPass.setBindGroup(0, bindGroups.dimension);
  splatVelocityPass.setBindGroup(1, bindGroups.mouse);
  splatVelocityPass.setBindGroup(2, createTextureBindGroup(velocityTexture));
  splatVelocityPass.draw(vertexCount);
  splatVelocityPass.end();

  transferTexture(velocityEncoder, processedVelocityTexture, velocityTexture);

  const curlPass = makeRenderPass(velocityEncoder, curlPipeline, curlTexture);
  curlPass.setBindGroup(0, bindGroups.parameter);
  curlPass.setBindGroup(1, createTextureBindGroup(velocityTexture));
  curlPass.draw(vertexCount);
  curlPass.end();

  const vorticityPass = makeRenderPass(velocityEncoder, vorticityPipeline, processedVelocityTexture);
  vorticityPass.setBindGroup(0, bindGroups.parameter);
  vorticityPass.setBindGroup(1, createCombineTextureBindGroup(curlTexture, velocityTexture));
  vorticityPass.draw(vertexCount);
  vorticityPass.end();

  transferTexture(velocityEncoder, processedVelocityTexture, velocityTexture);

  const divergencePass = makeRenderPass(velocityEncoder, divergencePipeline, divergenceTexture);
  divergencePass.setBindGroup(0, bindGroups.parameter);
  divergencePass.setBindGroup(1, createTextureBindGroup(velocityTexture));
  divergencePass.draw(vertexCount);
  divergencePass.end();

  const clearPressurePass = makeRenderPass(velocityEncoder, clearPressurePipeline, processedPressureTexture);
  clearPressurePass.setBindGroup(0, bindGroups.parameter);
  clearPressurePass.setBindGroup(1, createTextureBindGroup(pressureTexture));
  clearPressurePass.draw(vertexCount);
  clearPressurePass.end();

  transferTexture(velocityEncoder, processedPressureTexture, pressureTexture);

  for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
    const pressurePass = makeRenderPass(velocityEncoder, pressurePipeline, processedPressureTexture);
    pressurePass.setBindGroup(0, bindGroups.parameter);
    pressurePass.setBindGroup(1, createCombineTextureBindGroup(pressureTexture, divergenceTexture));
    pressurePass.draw(vertexCount);
    pressurePass.end();
    transferTexture(velocityEncoder, processedPressureTexture, pressureTexture);
  }

  const subtractPressurePass = makeRenderPass(velocityEncoder, subtractPressurePipeline, processedVelocityTexture);
  subtractPressurePass.setBindGroup(0, bindGroups.parameter);
  subtractPressurePass.setBindGroup(1, createCombineTextureBindGroup(pressureTexture, velocityTexture));
  subtractPressurePass.draw(vertexCount);
  subtractPressurePass.end();

  transferTexture(velocityEncoder, processedVelocityTexture, velocityTexture);

  const advectVelocityPass = makeRenderPass(velocityEncoder, advectVelocityPipeline, processedVelocityTexture);
  advectVelocityPass.setBindGroup(0, bindGroups.parameter);
  advectVelocityPass.setBindGroup(1, createCombineTextureBindGroup(velocityTexture, velocityTexture));
  advectVelocityPass.draw(vertexCount);
  advectVelocityPass.end();

  transferTexture(velocityEncoder, processedVelocityTexture, velocityTexture);

  device.queue.submit([velocityEncoder.finish()]);

  const screenEncoder = device.createCommandEncoder();
  device.queue.writeBuffer(buffers.parameter, 0, densityParams);

  const splatDensityPass = makeRenderPass(screenEncoder, splatDensityPipeline, processedDensityTexture);
  device.queue.writeBuffer(buffers.color, 0, mouse.isPointerDown ? dye : zero);
  splatDensityPass.setBindGroup(0, bindGroups.dimension);
  splatDensityPass.setBindGroup(1, bindGroups.mouse);
  splatDensityPass.setBindGroup(2, createTextureBindGroup(densityTexture));
  splatDensityPass.draw(vertexCount);
  splatDensityPass.end();

  transferTexture(screenEncoder, processedDensityTexture, densityTexture);

  const advectDenistyPass = makeRenderPass(screenEncoder, advectDenistyPipeline, processedDensityTexture);
  advectDenistyPass.setBindGroup(0, bindGroups.parameter);
  advectDenistyPass.setBindGroup(1, createCombineTextureBindGroup(densityTexture, velocityTexture));
  advectDenistyPass.draw(vertexCount);
  advectDenistyPass.end();

  transferTexture(screenEncoder, processedDensityTexture, densityTexture);

  const screenPass = makeRenderPass(screenEncoder, screenPipeline, screen.context.getCurrentTexture());
  screenPass.setBindGroup(0, createTextureBindGroup(densityTexture));
  screenPass.draw(vertexCount);
  screenPass.end();

  device.queue.submit([screenEncoder.finish()]);

  requestAnimationFrame(render);
}

render();
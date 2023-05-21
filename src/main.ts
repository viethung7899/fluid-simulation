import { makeUniformBuffers } from "./lib/buffer";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import { DELTA, DENSITY_DIFFUSION, FORCE_FACTOR, PRESSURE, PRESSURE_ITERATIONS, RADIUS, RESOLUTION, VELOCITY_DIFFUSION, VORTICITY } from "./lib/parameter";
import { useScreen } from "./lib/screen";
import { makeShaderModules } from "./lib/shader";
import { createVertexBuffer } from "./lib/vertices";

const app = document.querySelector<HTMLCanvasElement>('#app')!;
const screen = useScreen(app);
const { device, register } = await initalizeWebGPU();
const webgpu = register(app);
const mouse = useMouse(app, screen);
const getDimension = () => new Float32Array([screen.currentWidth, screen.currentHeight]);
const getAspectRatio = () => screen.currentWidth / screen.currentHeight;
const getSimulationDimension = () => {
  const aspectRatio = getAspectRatio();
  const longer = Math.floor(RESOLUTION * aspectRatio);
  if (aspectRatio > 1) return [longer, RESOLUTION] as const;
  return [RESOLUTION, longer] as const;
}
const shaders = makeShaderModules(device);

const sampler = device.createSampler({
  magFilter: "linear",
  minFilter: "linear",
});

const createSimulationTexture = (format?: GPUTextureFormat) => {
  return device.createTexture({
    size: getSimulationDimension(),
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
const textures = {
  // Begin state
  density: createScreenTexture(),
  velocity: createSimulationTexture("rg16float"),
  pressure: createSimulationTexture("r16float"),

  // Middle state
  curl: createSimulationTexture("r16float"),
  divergence: createSimulationTexture("r16float"),

  // Procceced state
  processedDensity: createScreenTexture(),
  processedVelocity: createSimulationTexture("rg16float"),
  processedPressure: createSimulationTexture("r16float"),
}


const updateTextureSize = (name: keyof typeof textures, width: number, height: number, encoder?: GPUCommandEncoder) => {
  const oldTexture = textures[name];
  const newTexture = device.createTexture({
    size: [width, height],
    format: oldTexture.format,
    usage: oldTexture.usage,
  });
  encoder?.copyTextureToTexture(
    { texture: oldTexture },
    { texture: newTexture },
    [Math.min(oldTexture.width, width), Math.min(oldTexture.height, height)]
  );
  textures[name] = newTexture;
}

const updateTextureOnWindowSize = () => {
  if (!screen.hasChangedSize()) return;
  screen.updateSize();
  const [simulationWidth, simulationHeight] = getSimulationDimension();
  const encoder = device.createCommandEncoder();

  updateTextureSize("density", screen.currentWidth, screen.currentHeight, encoder);
  updateTextureSize("processedDensity", screen.currentWidth, screen.currentHeight);
  updateTextureSize("velocity", simulationWidth, simulationHeight, encoder);
  updateTextureSize("processedVelocity", simulationWidth, simulationHeight);
  updateTextureSize("pressure", simulationWidth, simulationHeight, encoder);
  updateTextureSize("processedPressure", simulationWidth, simulationHeight);
  updateTextureSize("curl", simulationWidth, simulationHeight);
  updateTextureSize("divergence", simulationWidth, simulationHeight);

  device.queue.submit([encoder.finish()]);
}

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
      format: textures.density.format,
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
      format: textures.velocity.format,
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
      format: webgpu.canvasFormat
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
    targets: [{ format: textures.curl.format }]
  }
});

const vorticityPipeline = device.createRenderPipeline({
  label: "Curl pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "vorticity",
    targets: [{ format: textures.velocity.format }]
  }
});

const divergencePipeline = device.createRenderPipeline({
  label: "Divergence pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "divergence",
    targets: [{ format: textures.divergence.format }]
  }
});

const clearPressurePipeline = device.createRenderPipeline({
  label: "Clear pressure pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "clearPressure",
    targets: [{ format: textures.pressure.format }]
  }
});

const pressurePipeline = device.createRenderPipeline({
  label: "Clear pressure pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "pressure",
    targets: [{ format: textures.pressure.format }]
  }
});

const subtractPressurePipeline = device.createRenderPipeline({
  label: "Subtract pressure pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "subtractPressure",
    targets: [{ format: textures.velocity.format }]
  }
});

const advectVelocityPipeline = device.createRenderPipeline({
  label: "Advect velocity pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "advection",
    targets: [{ format: textures.velocity.format }]
  }
});

const advectDenistyPipeline = device.createRenderPipeline({
  label: "Advect velocity pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "advection",
    targets: [{ format: textures.density.format }]
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
  updateTextureOnWindowSize();

  device.queue.writeBuffer(buffers.dimension, 0, getDimension());
  device.queue.writeBuffer(buffers.radius, 0, new Float32Array([RADIUS]));
  device.queue.writeBuffer(buffers.mouse, 0, mouse.position);

  const velocityEncoder = device.createCommandEncoder();
  device.queue.writeBuffer(buffers.parameter, 0, velocityParams);


  const splatVelocityPass = makeRenderPass(velocityEncoder, splatVelocityPipeline, textures.processedVelocity);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(buffers.color, 0, mouse.isPointerDown ? new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]) : zero);
  splatVelocityPass.setBindGroup(0, bindGroups.dimension);
  splatVelocityPass.setBindGroup(1, bindGroups.mouse);
  splatVelocityPass.setBindGroup(2, createTextureBindGroup(textures.velocity));
  splatVelocityPass.draw(vertexCount);
  splatVelocityPass.end();

  transferTexture(velocityEncoder, textures.processedVelocity, textures.velocity);

  const curlPass = makeRenderPass(velocityEncoder, curlPipeline, textures.curl);
  curlPass.setBindGroup(0, bindGroups.parameter);
  curlPass.setBindGroup(1, createTextureBindGroup(textures.velocity));
  curlPass.draw(vertexCount);
  curlPass.end();

  const vorticityPass = makeRenderPass(velocityEncoder, vorticityPipeline, textures.processedVelocity);
  vorticityPass.setBindGroup(0, bindGroups.parameter);
  vorticityPass.setBindGroup(1, createCombineTextureBindGroup(textures.curl, textures.velocity));
  vorticityPass.draw(vertexCount);
  vorticityPass.end();

  transferTexture(velocityEncoder, textures.processedVelocity, textures.velocity);

  const divergencePass = makeRenderPass(velocityEncoder, divergencePipeline, textures.divergence);
  divergencePass.setBindGroup(0, bindGroups.parameter);
  divergencePass.setBindGroup(1, createTextureBindGroup(textures.velocity));
  divergencePass.draw(vertexCount);
  divergencePass.end();

  const clearPressurePass = makeRenderPass(velocityEncoder, clearPressurePipeline, textures.processedPressure);
  clearPressurePass.setBindGroup(0, bindGroups.parameter);
  clearPressurePass.setBindGroup(1, createTextureBindGroup(textures.pressure));
  clearPressurePass.draw(vertexCount);
  clearPressurePass.end();

  transferTexture(velocityEncoder, textures.processedPressure, textures.pressure);

  for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
    const pressurePass = makeRenderPass(velocityEncoder, pressurePipeline, textures.processedPressure);
    pressurePass.setBindGroup(0, bindGroups.parameter);
    pressurePass.setBindGroup(1, createCombineTextureBindGroup(textures.pressure, textures.divergence));
    pressurePass.draw(vertexCount);
    pressurePass.end();
    transferTexture(velocityEncoder, textures.processedPressure, textures.pressure);
  }

  const subtractPressurePass = makeRenderPass(velocityEncoder, subtractPressurePipeline, textures.processedVelocity);
  subtractPressurePass.setBindGroup(0, bindGroups.parameter);
  subtractPressurePass.setBindGroup(1, createCombineTextureBindGroup(textures.pressure, textures.velocity));
  subtractPressurePass.draw(vertexCount);
  subtractPressurePass.end();

  transferTexture(velocityEncoder, textures.processedVelocity, textures.velocity);

  const advectVelocityPass = makeRenderPass(velocityEncoder, advectVelocityPipeline, textures.processedVelocity);
  advectVelocityPass.setBindGroup(0, bindGroups.parameter);
  advectVelocityPass.setBindGroup(1, createCombineTextureBindGroup(textures.velocity, textures.velocity));
  advectVelocityPass.draw(vertexCount);
  advectVelocityPass.end();

  transferTexture(velocityEncoder, textures.processedVelocity, textures.velocity);

  device.queue.submit([velocityEncoder.finish()]);

  const screenEncoder = device.createCommandEncoder();
  device.queue.writeBuffer(buffers.parameter, 0, densityParams);

  const splatDensityPass = makeRenderPass(screenEncoder, splatDensityPipeline, textures.processedDensity);
  device.queue.writeBuffer(buffers.color, 0, mouse.isPointerDown ? dye : zero);
  splatDensityPass.setBindGroup(0, bindGroups.dimension);
  splatDensityPass.setBindGroup(1, bindGroups.mouse);
  splatDensityPass.setBindGroup(2, createTextureBindGroup(textures.density));
  splatDensityPass.draw(vertexCount);
  splatDensityPass.end();

  transferTexture(screenEncoder, textures.processedDensity, textures.density);

  const advectDenistyPass = makeRenderPass(screenEncoder, advectDenistyPipeline, textures.processedDensity);
  advectDenistyPass.setBindGroup(0, bindGroups.parameter);
  advectDenistyPass.setBindGroup(1, createCombineTextureBindGroup(textures.density, textures.velocity));
  advectDenistyPass.draw(vertexCount);
  advectDenistyPass.end();

  transferTexture(screenEncoder, textures.processedDensity, textures.density);

  const screenPass = makeRenderPass(screenEncoder, screenPipeline, webgpu.context.getCurrentTexture());
  screenPass.setBindGroup(0, createTextureBindGroup(textures.density));
  screenPass.draw(vertexCount);
  screenPass.end();

  device.queue.submit([screenEncoder.finish()]);

  requestAnimationFrame(render);
}

render();
import { makeUniformBuffers } from "./lib/buffer";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import { DELTA, FORCE_FACTOR, RADIUS, VORTICITY } from "./lib/parameter";
import { makeShaderModules } from "./lib/shader";
import { createVertexBuffer } from "./lib/vertices";

const WIDTH = 800;
const HEIGHT = 600;
const ASPECT_RATIO = WIDTH / HEIGHT;
const SIM_HEIGHT = 128;
const SIM_WIDTH = Math.floor(SIM_HEIGHT * ASPECT_RATIO);


const app = document.querySelector<HTMLCanvasElement>('#app')!;
const mini = document.querySelector<HTMLCanvasElement>('#mini')!;

app.width = WIDTH;
app.height = HEIGHT;
mini.width = SIM_WIDTH;
mini.height = SIM_HEIGHT;
const { device, register } = await initalizeWebGPU();
const screen = register(app);
const miniScreen = register(mini);
const mouse = useMouse(app);
const getDimension = () => new Float32Array([app.width, app.height]);
const getAspectRatio = () => app.width / app.height;
const shaders = makeShaderModules(device);

const sampler = device.createSampler({
  magFilter: "linear",
});

const createSimulationTexture = (format?: GPUTextureFormat) => {
  return device.createTexture({
    size: [SIM_WIDTH, SIM_HEIGHT],
    format: format || "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
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
device.queue.writeBuffer(buffers.parameter, 0, new Float32Array([RADIUS, DELTA, VORTICITY]));


// Create simulations texture
const splatVelocityTexture = createSimulationTexture("rg16float");
const curlTexture = createSimulationTexture("r16float");
const divergenceTexture = createSimulationTexture("r16float");
const vorticityTexture = createSimulationTexture("rg16float");

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

// Bind groups
const splatVelocityGroup = createTextureBindGroup(splatVelocityTexture);
const curlAndVelocityGroup = createCombineTextureBindGroup(curlTexture, splatVelocityTexture);
const vorticityGroup = createTextureBindGroup(vorticityTexture);

// Create pipelines
const splatPipeline = device.createRenderPipeline({
  label: "Splat pipeline",
  layout: device.createPipelineLayout({
    label: "Screen pipeline layout",
    bindGroupLayouts: [layouts.binding.dimension, layouts.binding.mouse, layouts.binding.parameter],
  }),
  vertex,
  fragment: {
    module: shaders.splat,
    entryPoint: "main",
    targets: [{
      format: splatVelocityTexture.format,
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
    targets: [{
      format: curlTexture.format,
    }]
  }
});

const vorticityPipeline = device.createRenderPipeline({
  label: "Curl pipeline",
  layout: combinePipelineLayout,
  vertex,
  fragment: {
    module: shaders.combine,
    entryPoint: "vorticity",
    targets: [{
      format: vorticityTexture.format,
    }]
  }
});

const divergencePipeline = device.createRenderPipeline({
  label: "Divergence pipeline",
  layout: simulationPipelineLayout,
  vertex,
  fragment: {
    module: shaders.simulation,
    entryPoint: "divergence",
    targets: [{
      format: divergenceTexture.format,
    }]
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

const displayGroup = createTextureBindGroup(divergenceTexture);

const render = () => {
  const encoder = device.createCommandEncoder();

  const splatPass = makeRenderPass(encoder, splatPipeline, splatVelocityTexture);
  device.queue.writeBuffer(buffers.mouse, 0, mouse.position);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(buffers.color, 0, new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]));
  splatPass.setBindGroup(0, bindGroups.dimension);
  splatPass.setBindGroup(1, bindGroups.mouse);
  splatPass.setBindGroup(2, bindGroups.parameter);
  splatPass.draw(vertexCount);
  splatPass.end();

  const curlPass = makeRenderPass(encoder, curlPipeline, curlTexture);
  curlPass.setBindGroup(0, bindGroups.dimension);
  curlPass.setBindGroup(1, bindGroups.parameter);
  curlPass.setBindGroup(2, splatVelocityGroup);
  curlPass.draw(vertexCount);
  curlPass.end();

  const vorticityPass = makeRenderPass(encoder, vorticityPipeline, vorticityTexture);
  vorticityPass.setBindGroup(0, bindGroups.dimension);
  vorticityPass.setBindGroup(1, bindGroups.parameter);
  vorticityPass.setBindGroup(2, curlAndVelocityGroup);
  vorticityPass.draw(vertexCount);
  vorticityPass.end();

  const divergencePass = makeRenderPass(encoder, divergencePipeline, divergenceTexture);
  divergencePass.setBindGroup(0, bindGroups.dimension);
  divergencePass.setBindGroup(1, bindGroups.parameter);
  divergencePass.setBindGroup(2, vorticityGroup);
  divergencePass.draw(vertexCount);
  divergencePass.end();

  const screenPass = makeRenderPass(encoder, screenPipeline, screen.context.getCurrentTexture());
  screenPass.setBindGroup(0, displayGroup);
  screenPass.draw(vertexCount);
  screenPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
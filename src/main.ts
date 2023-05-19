import { makeUniformBuffers } from "./lib/buffer";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import { FORCE_FACTOR, RADIUS } from "./lib/parameter";
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

// Create buffers
const { vertexBuffer, vertexBufferLayout, vertexCount } = createVertexBuffer(device);
const { buffers, layouts, bindGroups } = makeUniformBuffers(device);

// Write to buffres
device.queue.writeBuffer(buffers.dimension, 0, getDimension());
device.queue.writeBuffer(buffers.parameter, 0, new Float32Array([RADIUS]));


// Create the texture
const texture = device.createTexture({
  size: [SIM_WIDTH, SIM_HEIGHT],
  format: "rgba16float",
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});

// Create the sampler
const sampler = device.createSampler({
  magFilter: "linear",
  minFilter: "linear",
});

// Create the pipeline
const splatPipeline = device.createRenderPipeline({
  label: "Screen pipeline",
  layout: device.createPipelineLayout({
    label: "Screen pipeline layout",
    bindGroupLayouts: [layouts.binding.mouse, layouts.binding.dimension, layouts.binding.parameter],
  }),
  vertex: {
    module: shaders.screen,
    entryPoint: "main",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: shaders.splat,
    entryPoint: "main",
    targets: [{
      format: texture.format,
    }],
  }
});

const screenPipeline = device.createRenderPipeline({
  label: "Screen pipeline",
  layout: device.createPipelineLayout({
    label: "Screen pipeline layout",
    bindGroupLayouts: [layouts.binding.texture],
  }),
  vertex: {
    module: shaders.screen,
    entryPoint: "main",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: shaders.display,
    entryPoint: "main",
    targets: [{
      format: screen.canvasFormat
    }]
  }
});

const textureBingGroup = device.createBindGroup({
  layout: layouts.binding.texture,
  entries: [{
    binding: 0,
    resource: sampler,
  }, {
    binding: 1,
    resource: texture.createView(),
  }]
});

const render = () => {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: texture.createView(),
      loadOp: "clear",
      storeOp: "store",
    }]
  });

  pass.setPipeline(splatPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  device.queue.writeBuffer(buffers.mouse, 0, mouse.position);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(buffers.color, 0, new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]));
  pass.setBindGroup(0, bindGroups.mouse);
  pass.setBindGroup(1, bindGroups.dimension);
  pass.setBindGroup(2, bindGroups.parameter);
  pass.draw(vertexCount);

  pass.end();

  const screenPass = encoder.beginRenderPass({
    colorAttachments: [{
      view: screen.context.getCurrentTexture().createView(),
      loadOp: "clear",
      storeOp: "store",
    }]
  });
  screenPass.setPipeline(screenPipeline);
  screenPass.setVertexBuffer(0, vertexBuffer);
  screenPass.setBindGroup(0, textureBingGroup);
  screenPass.draw(vertexCount);
  screenPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
import { initalizeWebGPU } from "./lib/initialize";
import { makeLayouts } from "./lib/layout";
import { useMouse } from "./lib/mouse";
import { FORCE_FACTOR, RADIUS } from "./lib/parameter";
import { makeShaderModules } from "./lib/shader";
import { createVertexBuffer } from "./lib/vertices";

const app = document.querySelector<HTMLCanvasElement>('#app')!;
const { device, register } = await initalizeWebGPU();
const { context, canvasFormat } = register(app);
const mouse = useMouse(app);
const getDimension = () => new Float32Array([app.width, app.height]);
const getAspectRatio = () => app.width / app.height;
const shaders = makeShaderModules(device);
const layouts = makeLayouts(device);

// Create vertex buffer
const { vertexBuffer, vertexBufferLayout, vertexCount } = createVertexBuffer(device);


const mouseBuffer = device.createBuffer({
  label: "Mouse position buffer",
  size: 2 * Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const colorBuffer = device.createBuffer({
  label: "Color buffer",
  size: 3 * Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const dimensionBuffer = device.createBuffer({
  label: "Data buffer",
  size: 2 * Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(dimensionBuffer, 0, getDimension());

const parameterData = new Float32Array([RADIUS]);
const parameterBuffer = device.createBuffer({
  label: "Parameters buffer",
  size: Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(parameterBuffer, 0, parameterData);

// Bind group
const mouseBindGroup = device.createBindGroup({
  label: "mouse group",
  layout: layouts.binding.mouse,
  entries: [{
    binding: 0,
    resource: { buffer: mouseBuffer },
  }, {
    binding: 1,
    resource: { buffer: colorBuffer },
  }]
});

const dimensionBindGroup = device.createBindGroup({
  label: "mouse group",
  layout: layouts.binding.dimension,
  entries: [{
    binding: 0,
    resource: { buffer: dimensionBuffer },
  }]
});

const parameterBindGroup = device.createBindGroup({
  label: "parameter group",
  layout: layouts.binding.parameter,
  entries: [{
    binding: 0,
    resource: { buffer: parameterBuffer },
  }]
});

// Create the pipeline
const screenPipeline = device.createRenderPipeline({
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
      format: canvasFormat,
    }],
  }
});

const render = () => {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      storeOp: "store",
    }]
  });

  pass.setPipeline(screenPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  device.queue.writeBuffer(mouseBuffer, 0, mouse.position);
  const [dx, dy] = mouse.movement;
  device.queue.writeBuffer(colorBuffer, 0, new Float32Array([dx * FORCE_FACTOR * getAspectRatio(), dy * FORCE_FACTOR, 0]));
  pass.setBindGroup(0, mouseBindGroup);
  pass.setBindGroup(1, dimensionBindGroup);
  pass.setBindGroup(2, parameterBindGroup);
  pass.draw(vertexCount);

  pass.end();
  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
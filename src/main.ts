import { RADIUS, VERTICES } from "./lib/data";
import { initalizeWebGPU } from "./lib/initialize";
import { useMouse } from "./lib/mouse";
import colorShader from "./shaders/color.wgsl?raw";
import screenShader from "./shaders/screen.wgsl?raw";

const app = document.querySelector<HTMLCanvasElement>('#app')!;
const { device, register } = await initalizeWebGPU();
const { context, canvasFormat } = register(app);
const mouse = useMouse(app);
const getAspectRatio = () => app.clientWidth / app.clientHeight;

// Create vertex buffer
const vertexBuffer = device.createBuffer({
  label: "Vertices",
  size: VERTICES.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, /*offset*/0, VERTICES);

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 8,
  attributes: [{
    format: "float32x2",
    offset: 0,
    shaderLocation: 0,
  }],
};

// Create the shaders
const shaderModule = device.createShaderModule({
  label: "Screen shader",
  code: screenShader
});

const colorShaderModule = device.createShaderModule({
  label: "Color shader",
  code: colorShader
});

// Bind group layout
const bindGroupLayout = device.createBindGroupLayout({
  label: "Bind group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {},
  },
  {
    binding: 1,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {},
  }]
});

// Pipeline layout
const pipelineLayout = device.createPipelineLayout({
  label: "Pipeline layout",
  bindGroupLayouts: [bindGroupLayout],
});

// Uniform buffer
const mousePositionBuffer = device.createBuffer({
  label: "Mouse position buffer",
  size: mouse.position.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(mousePositionBuffer, 0, mouse.position);

const data = new Float32Array([getAspectRatio(), RADIUS]);
const dataBuffer = device.createBuffer({
  label: "Data buffer",
  size: data.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(dataBuffer, 0, data);

// Bind group
const bindGroup = device.createBindGroup({
  label: "Bind group",
  layout: bindGroupLayout,
  entries: [{
    binding: 0,
    resource: { buffer: mousePositionBuffer },
  },
  {
    binding: 1,
    resource: { buffer: dataBuffer },
  }]
});

// Create the pipeline
const screenPipeline = device.createRenderPipeline({
  label: "Screen pipeline",
  layout: pipelineLayout,
  vertex: {
    module: shaderModule,
    entryPoint: "main",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: colorShaderModule,
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
  device.queue.writeBuffer(mousePositionBuffer, 0, mouse.position);
  pass.setBindGroup(0, bindGroup);
  pass.draw(VERTICES.length / 2);

  pass.end();
  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
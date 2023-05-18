import { VERTICES } from "./lib/data";
import { initalizeWebGPU } from "./lib/initialize";
import screenShader from "./shaders/screen.wgsl?raw";
import colorShader from "./shaders/color.wgsl?raw";
import { useMouse } from "./lib/mouse";

const app = document.querySelector<HTMLCanvasElement>('#app')!;
const { device, context, canvasFormat } = await initalizeWebGPU(app);
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

// Create the pipeline
const screenPipeline = device.createRenderPipeline({
  label: "Screen pipeline",
  layout: "auto",
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
  // pass.setBindGroup(0, bindGroup);
  pass.draw(VERTICES.length / 2);

  pass.end();
  device.queue.submit([encoder.finish()]);
}

render();
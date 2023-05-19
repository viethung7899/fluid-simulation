import { makeLayouts } from "./layout";

export const makeUniformBuffers = (device: GPUDevice) => {
  const layouts = makeLayouts(device);

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

  const parameterBuffer = device.createBuffer({
    label: "Parameters buffer",
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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


  return {
    buffers: {
      mouse: mouseBuffer,
      color: colorBuffer,
      dimension: dimensionBuffer,
      parameter: parameterBuffer,
    },
    layouts,
    bindGroups: {
      mouse: mouseBindGroup,
      dimension: dimensionBindGroup,
      parameter: parameterBindGroup,
    }
  }
}
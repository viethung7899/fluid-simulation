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

  const radiusBuffer = device.createBuffer({
    label: "Radius buffer",
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const dimensionBuffer = device.createBuffer({
    label: "Data buffer",
    size: 2 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const parameterBuffer = device.createBuffer({
    label: "Parameters buffer",
    size: 5 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const mouseBindGroup = device.createBindGroup({
    label: "Mouse group",
    layout: layouts.binding.mouse,
    entries: [{
      binding: 0,
      resource: { buffer: mouseBuffer },
    }, {
      binding: 1,
      resource: { buffer: colorBuffer },
    }, {
      binding: 2,
      resource: { buffer: radiusBuffer },
    }]
  });

  const dimensionBindGroup = device.createBindGroup({
    label: "Dimension group",
    layout: layouts.binding.dimension,
    entries: [{
      binding: 0,
      resource: { buffer: dimensionBuffer },
    }]
  });

  const parameterBindGroup = device.createBindGroup({
    label: "Parameter group",
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
      radius: radiusBuffer,
    },
    layouts,
    bindGroups: {
      mouse: mouseBindGroup,
      dimension: dimensionBindGroup,
      parameter: parameterBindGroup,
    }
  }
}
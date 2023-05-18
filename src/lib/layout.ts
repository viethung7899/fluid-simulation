const mouseBindingDescriptor: GPUBindGroupLayoutDescriptor = {
  label: "Mouse binding group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {}, // mouse position
  },
  {
    binding: 1,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {}, // color data
  }]
};

const dimensionBindingDescriptor: GPUBindGroupLayoutDescriptor = {
  label: "Dimension binding group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
    buffer: {}, // resolution data
  }]
}

const parameterBindingDescriptor: GPUBindGroupLayoutDescriptor = {
  label: "Parameter binding group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {}, // resolution data
  }]
}

const textureBindingDescriptor: GPUBindGroupLayoutDescriptor = {
  label: "Texture binding group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    texture: {}, // texture data
  }]
}

export const makeLayouts = (device: GPUDevice) => {
  const mouseBindGroupLayout = device.createBindGroupLayout(mouseBindingDescriptor);
  const dimensionBindGroupLayout = device.createBindGroupLayout(dimensionBindingDescriptor);
  const parameterBindGroupLayout = device.createBindGroupLayout(parameterBindingDescriptor);
  const textureBindGroupLayout = device.createBindGroupLayout(textureBindingDescriptor);

  return {
    binding: {
      mouse: mouseBindGroupLayout,
      dimension: dimensionBindGroupLayout,
      parameter: parameterBindGroupLayout,
      texture: textureBindGroupLayout,
    }
  }
}


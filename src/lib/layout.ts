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
  },
  {
    binding: 2,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: {}, // radius data
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
    sampler: {}, // texture data
  }, {
    binding: 1,
    visibility: GPUShaderStage.FRAGMENT, // texture data
    texture: {
      sampleType: "float",
    },
  }]
}

const doubleTexturesBindingDescriptor: GPUBindGroupLayoutDescriptor = {
  label: "Texture binding group layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    sampler: {}, // sampler data
  }, {
    binding: 1,
    visibility: GPUShaderStage.FRAGMENT, // source texture data
    texture: {
      sampleType: "float",
    },
  },
  {
    binding: 2,
    visibility: GPUShaderStage.FRAGMENT,
    texture: {
      sampleType: "float",
    }, // target texture data
  }]
}

export const makeLayouts = (device: GPUDevice) => {
  const mouseBindGroupLayout = device.createBindGroupLayout(mouseBindingDescriptor);
  const dimensionBindGroupLayout = device.createBindGroupLayout(dimensionBindingDescriptor);
  const parameterBindGroupLayout = device.createBindGroupLayout(parameterBindingDescriptor);
  const textureBindGroupLayout = device.createBindGroupLayout(textureBindingDescriptor);
  const doubleTexturesBindGroupLayout = device.createBindGroupLayout(doubleTexturesBindingDescriptor);

  return {
    binding: {
      mouse: mouseBindGroupLayout,
      dimension: dimensionBindGroupLayout,
      parameter: parameterBindGroupLayout,
      texture: textureBindGroupLayout,
      doubleTextures: doubleTexturesBindGroupLayout,
    }
  }
}


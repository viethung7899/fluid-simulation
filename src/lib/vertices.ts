// Data for the square
const VERTICES = new Float32Array([
  -1, -1, // Triangle 1 (Blue)
  1, -1,
  1, 1,

  -1, -1, // Triangle 2 (Red)
  1, 1,
  -1, 1,
])

// Create vertex buffer
export const createVertexBuffer = (device: GPUDevice) => {
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

  return {
    vertexBuffer,
    vertexBufferLayout,
    vertexCount: VERTICES.length / 2,
  }
}

export const initalizeWebGPU = async () => {
  // Request an adapter
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported on this browser.");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
  }

  const device = await adapter.requestDevice();

  const register = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("webgpu")!;
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: canvasFormat,
    });
    return {
      context,
      canvasFormat,
    }
  }

  return {
    device,
    register,
  }
}

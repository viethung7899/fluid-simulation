@group(1) @binding(0) var ourSampler: sampler;
@group(1) @binding(1) var ourTexture: texture_2d<f32>;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  let color = textureSample(ourTexture, ourSampler, coord);
  return vec4f(color.rg, 0, 1);
}
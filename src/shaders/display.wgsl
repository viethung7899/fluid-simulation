@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  let color = textureSample(ourTexture, ourSampler, coord);
  return vec4f(color.rgb, 1);
}
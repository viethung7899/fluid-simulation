@group(0) @binding(0) var<uniform> mouse: vec2f;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  return vec4f(coord, 0, 1);
}
struct Data {
  aspectRatio: f32,
  radius: f32,
};

@group(0) @binding(0) var<uniform> mouse: vec2f;
@group(0) @binding(1) var<uniform> data: Data;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  var p = coord - mouse;
  p.y /= data.aspectRatio;
  let factor = exp(-dot(p, p) / data.radius);
  return vec4f(factor, 0, 0, 1);
}
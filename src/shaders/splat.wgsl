@group(0) @binding(0) var<uniform> res: vec2f;
@group(1) @binding(0) var<uniform> position: vec2f;
@group(1) @binding(1) var<uniform> color: vec3f;
@group(1) @binding(2) var<uniform> radius: f32;
@group(2) @binding(0) var sam: sampler;
@group(2) @binding(1) var texture: texture_2d<f32>;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  let base = textureSample(texture, sam, coord).xyz;
  var p = coord - position;
  p.x *= res.x / res.y;
  let factor = exp(-dot(p, p) / radius);
  return vec4f(base + factor * color, 1);
}

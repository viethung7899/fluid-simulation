struct Parameter {
  radius: f32,
};

@group(0) @binding(0) var<uniform> position: vec2f;
@group(0) @binding(1) var<uniform> color: vec3f;
@group(1) @binding(0) var<uniform> res: vec2f;
@group(2) @binding(0) var<uniform> params: Parameter;

@fragment
fn main(@location(0) coord: vec2f) -> @location(0) vec4f {
  let ratio = res.x / res.y;
  var p = coord - position;
  p.x *= ratio;
  let factor = exp(-dot(p, p) / params.radius);
  return vec4f(factor * color, 1);
}
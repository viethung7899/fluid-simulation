struct Parameter {
  radius: f32,
};

struct Neighbor {
  top: vec2f,
  bottom: vec2f,
  left: vec2f,
  right: vec2f,
};

@group(0) @binding(0) var<uniform> res: vec2f;
@group(1) @binding(0) var<uniform> params: Parameter;
@group(2) @binding(0) var sam: sampler;
@group(2) @binding(1) var texture: texture_2d<f32>;

fn getSurrounding(coord: vec2f) -> Neighbor {
  var neighbor: Neighbor;
  neighbor.top = vec2f(coord.x, coord.y + 1.0 / res.y);
  neighbor.bottom = vec2f(coord.x, coord.y - 1.0 / res.y);
  neighbor.left = vec2f(coord.x - 1.0 / res.x, coord.y);
  neighbor.right = vec2f(coord.x + 1.0 / res.x, coord.y);
  return neighbor;
}

@fragment
fn curl(@location(0) coord: vec2f) -> @location(0) f32 {
  let neighbor = getSurrounding(coord);
  let top = textureSample(texture, sam, neighbor.top).x;
  let bottom = textureSample(texture, sam, neighbor.bottom).x;
  let left = textureSample(texture, sam, neighbor.left).y;
  let right = textureSample(texture, sam, neighbor.right).y;
  let vorticity = right - left - bottom + top;
  return vorticity * 0.5;
}

@fragment
fn main(@location(0) coord: vec2f) {
  
}
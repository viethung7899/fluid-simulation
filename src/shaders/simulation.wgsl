struct Parameter {
  radius: f32,
  delta: f32,
  vorticity: f32
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

fn getSurrounding(texture: texture_2d<f32>, coord: vec2f) -> Neighbor {
  var neighbor: Neighbor;
  let texel = 1 / vec2f(textureDimensions(texture, 0).xy);
  neighbor.top = vec2f(coord.x, coord.y + texel.y);
  neighbor.bottom = vec2f(coord.x, coord.y - texel.y);
  neighbor.left = vec2f(coord.x - texel.x, coord.y);
  neighbor.right = vec2f(coord.x + texel.x, coord.y);
  return neighbor;
}

@fragment
fn curl(@location(0) coord: vec2f) -> @location(0) f32 {
  let neighbor = getSurrounding(texture, coord);
  let top = textureSample(texture, sam, neighbor.top).x;
  let bottom = textureSample(texture, sam, neighbor.bottom).x;
  let left = textureSample(texture, sam, neighbor.left).y;
  let right = textureSample(texture, sam, neighbor.right).y;
  let vorticity = right - left - bottom + top;
  return vorticity * 0.5;
}

@fragment
fn divergence(@location(0) coord: vec2f) -> @location(0) f32 {
  let neighbor = getSurrounding(texture, coord);
  var top = textureSample(texture, sam, neighbor.top).y;
  var bottom = textureSample(texture, sam, neighbor.bottom).y;
  var left = textureSample(texture, sam, neighbor.left).x;
  var right = textureSample(texture, sam, neighbor.right).x;
  let center = textureSample(texture, sam, coord).xy;

  if (neighbor.left.x < 0) {
    left = -center.x;
  }
  if (neighbor.right.x > 1) {
    right = -center.x;
  }
  if (neighbor.top.y > 1) {
    top = -center.y;
  }
  if (neighbor.bottom.y < 0) {
    bottom = -center.y;
  }

  return 0.5 * (right - left + top - bottom);
}

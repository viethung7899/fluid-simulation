struct Parameter {
  delta: f32,
  vorticity: f32,
  pressure: f32,
  diffusion: f32
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
@group(2) @binding(1) var textureIn: texture_2d<f32>;
@group(2) @binding(2) var textureOut: texture_2d<f32>;

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
fn vorticity(@location(0) coord: vec2f) -> @location(0) vec2f {
  let neighbor = getSurrounding(textureIn, coord);
  let left = textureSample(textureIn, sam, neighbor.left).x;
  let right = textureSample(textureIn, sam, neighbor.right).x;
  let top = textureSample(textureIn, sam, neighbor.top).x;
  let bottom = textureSample(textureIn, sam, neighbor.bottom).x;
  let center = textureSample(textureIn, sam, coord).x;

  var force = vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force /= length(force) + 0.00001;
  force *= params.vorticity * center;
  force.y *= -1;


  let velocity = textureSample(textureOut, sam, coord).xy;
  return velocity + params.delta * force;
}

@fragment
fn pressure(@location(0) coord: vec2f) -> @location(0) f32 {
  let neighbor = getSurrounding(textureIn, coord);
  let left = textureSample(textureIn, sam, neighbor.left).x;
  let right = textureSample(textureIn, sam, neighbor.right).x;
  let top = textureSample(textureIn, sam, neighbor.top).x;
  let bottom = textureSample(textureIn, sam, neighbor.bottom).x;
  let divergence = textureSample(textureOut, sam, coord).x;
  return (left + right + top + bottom - divergence) * 0.25;
}

@fragment
fn subtractPressure(@location(0) coord: vec2f) -> @location(0) vec2f {
  let neighbor = getSurrounding(textureIn, coord);
  let left = textureSample(textureIn, sam, neighbor.left).x;
  let right = textureSample(textureIn, sam, neighbor.right).x;
  let top = textureSample(textureIn, sam, neighbor.top).x;
  let bottom = textureSample(textureIn, sam, neighbor.bottom).x;
  let velocity = textureSample(textureOut, sam, coord).xy;
  return velocity - vec2(right - left, top - bottom);
}

@fragment
fn advection(@location(0) coord: vec2f) -> @location(0) vec4f {
  let position = coord - params.delta * textureSample(textureOut, sam, coord).xy / vec2f(textureDimensions(textureOut, 0).xy);
  let result = textureSample(textureIn, sam, position);
  return result / (1 + params.diffusion * params.delta);
}
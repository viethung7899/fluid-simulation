struct Fragment {
  @builtin(position) pos: vec4f,
  @location(0) coord: vec2f,
  @location(1) top: vec2f,
  @location(2) bottom: vec2f,
  @location(3) left: vec2f,
  @location(4) right: vec2f,
};

@group(0) @binding(0) var<uniform> res: vec2f;

@vertex
fn main(@location(0) pos: vec2f) -> Fragment {
  var coord = pos / 2 + 0.5;
  coord.y = 1 - coord.y;
  var frag: Fragment;
  frag.pos = vec4f(pos, 0, 1);
  frag.coord = coord;
  frag.top = coord + vec2f(0, -1) / res;
  frag.bottom = coord + vec2f(0, 1) / res;
  frag.left = coord + vec2f(-1, 0) / res;
  frag.right = coord + vec2f(1, 0) / res;
  return frag;
}

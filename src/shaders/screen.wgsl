struct Fragment {
  @builtin(position) pos: vec4f,
  @location(0) coord: vec2f,
};

@vertex
fn main(@location(0) pos: vec2f) -> Fragment {
  var frag: Fragment;
  frag.pos = vec4f(pos, 0, 1);
  frag.coord = pos / 2 + 0.5;
  frag.coord.y = 1 - frag.coord.y;
  return frag;
}

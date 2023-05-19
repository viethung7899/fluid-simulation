struct Fragment {
  @builtin(position) pos: vec4f,
  @location(0) coord: vec2f
};

@vertex
fn main(@location(0) pos: vec2f) -> Fragment {
  var coord = pos / 2 + 0.5;
  coord.y = 1 - coord.y;
  var frag: Fragment;
  frag.pos = vec4f(pos, 0, 1);
  frag.coord = coord;
  return frag;
}

#version 300 es
precision highp float;

in vec3 position;

out vec4 frag_color;

uniform sampler2D equirectangular_map;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 getUVforEquirectangularMap(vec3 dir) {
  vec2 uv = vec2(atan(dir.z, dir.x), asin(dir.y));
  return uv * invAtan + 0.5;
}

void main() {
  vec2 uv = getUVforEquirectangularMap(normalize(position));
  vec3 color = texture(equirectangular_map, uv).rgb;
  frag_color = vec4(color, 1.0);
}
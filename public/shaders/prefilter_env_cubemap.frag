#version 300 es
precision highp float;

in vec3 position;

out vec4 frag_color;

uniform samplerCube environment_map;
uniform float roughness;

void main() {
  // Output debug color
  frag_color = vec4(1.0, 0.0, 1.0, 1.0);
}
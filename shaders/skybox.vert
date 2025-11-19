#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

out vec3 tex_coords;

uniform mat4 V;
uniform mat4 P;
uniform mat4 VP;

void main() {
  tex_coords = a_position;
  tex_coords.y = -tex_coords.y;
  vec4 viewSpacePos = V * vec4(a_position, 0.0);
  vec4 clipSpacePos = P * vec4(viewSpacePos.xyz, 1.0);

  gl_Position = clipSpacePos.xyww;
}
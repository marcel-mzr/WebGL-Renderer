#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

out vec3 tex_coords;

uniform mat4 VP;

void main() {
  tex_coords = a_position;
  gl_Position = VP * vec4(a_position, 1.0);
}
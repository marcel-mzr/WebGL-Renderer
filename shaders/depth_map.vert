#version 300 es
precision highp float;

layout (location = 0) in vec3 a_position;

uniform mat4 M;
uniform mat4 light_view;
uniform mat4 light_space_matrix;

void main() {
  gl_Position = light_space_matrix * M * vec4(a_position, 1.0);
}
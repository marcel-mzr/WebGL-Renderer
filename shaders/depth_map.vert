#version 300 es
precision highp float;

layout (location = 0) in vec3 a_position;

uniform mat4 M;
uniform mat4 light_view;
uniform mat4 light_projection;

void main() {
  gl_Position = light_projection * light_view * M * vec4(a_position, 1.0);
}
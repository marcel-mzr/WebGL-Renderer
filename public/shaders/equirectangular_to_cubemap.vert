#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

out vec3 position;

uniform mat4 V;
uniform mat4 P;

void main() {
  position = a_position;
  gl_Position = P * V * vec4(position, 1.0);
}
#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;

out vec2 position;
out vec2 uv;

void main() {
  position = a_position;
  uv = a_uv;
  gl_Position = vec4(a_position.x, a_position.y, 0.0, 1.0);
}
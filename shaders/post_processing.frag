#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

out vec4 outColor;

uniform sampler2D forward_render;

void main() {
  outColor = texture(forward_render, uv);
}
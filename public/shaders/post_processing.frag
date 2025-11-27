#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

out vec4 out_color;

uniform sampler2D forward_render;

void main() {
  out_color = texture(forward_render, uv);
}
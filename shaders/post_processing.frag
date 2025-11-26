#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

out vec4 out_color;

uniform sampler2D forward_render;

void main() {
  float depth_val = texture(forward_render, uv).r;
  out_color = vec4(vec3(depth_val), 1.0);
}
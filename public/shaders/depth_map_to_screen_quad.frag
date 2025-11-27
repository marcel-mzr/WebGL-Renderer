#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

out vec4 out_color;

uniform sampler2D depth_map;

void main() {
  out_color = vec4(vec3(texture(depth_map, uv).r), 1.0);
  
}
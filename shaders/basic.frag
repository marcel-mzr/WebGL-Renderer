#version 300 es
precision highp float;

in vec3 normal;
in vec2 uv;

out vec4 outColor;

uniform sampler2D diffuse_texture;
uniform sampler2D specular_texture;


void main() {
  outColor = texture(diffuse_texture, uv);
}
#version 300 es
precision highp float;

in vec3 tex_coords;

out vec4 outColor;

uniform samplerCube skybox;

void main() {
  outColor = texture(skybox, tex_coords);
}
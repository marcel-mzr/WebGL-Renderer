#version 300 es
precision highp float;

in vec3 tex_coords;

out vec4 frag_color;

uniform samplerCube skybox;

void main() {
  frag_color = texture(skybox, tex_coords);
}
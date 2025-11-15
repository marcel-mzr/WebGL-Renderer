#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

out vec3 normal;
out vec2 uv;

uniform mat4 VP;
uniform mat4 M;

void main() {
  normal = a_normal;
  uv = a_uv;
  
  mat4 MVP = VP * M;
  gl_Position = MVP * vec4(a_position, 1.0);
}
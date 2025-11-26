#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_tangent;
layout(location = 3) in vec2 a_uv;

out vec3 position;
out vec3 normal;
out vec4 tangent;
out vec2 uv;

out vec4 light_space_position;

uniform mat4 VP;
uniform mat4 M;
uniform mat4 light_space_matrix;

void main() {

  mat4 M_transp_inv = transpose(inverse(M));

  position = (M * vec4(a_position, 1.0)).xyz;
  normal = vec3(M_transp_inv * vec4(a_normal, 0.0));
  tangent = vec4(vec3(M_transp_inv * vec4(a_tangent.xyz, 0.0)), a_tangent.w);
  uv = a_uv;

  light_space_position = light_space_matrix * vec4(position, 1.0);

  mat4 MVP = VP * M;
  gl_Position = MVP * vec4(a_position, 1.0);
}
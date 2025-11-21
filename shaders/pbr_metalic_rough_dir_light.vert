#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_tangent;
layout(location = 3) in vec2 a_uv;

out vec3 position;
out vec3 normal;
out vec2 uv;
out mat3 TBN;

uniform mat4 VP;
uniform mat4 M;

mat3 calculateTBN();

void main() {
  position = (M * vec4(a_position, 1.0)).xyz;
  normal = (transpose(inverse(M)) * vec4(a_normal, 0.0)).xyz;
  uv = a_uv;
  TBN = calculateTBN();

  mat4 MVP = VP * M;
  gl_Position = MVP * vec4(a_position, 1.0);
}

/**
 * Calculates the TBN used for normal mapping
 */
mat3 calculateTBN() {
  vec3 N = normalize(normal);
  vec3 T = a_tangent.xyz;
  vec3 B = normalize(cross(N, T) * a_tangent.w);

  return mat3(T, B, N);
}
#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

out vec3 position;

uniform mat4 V;
uniform mat4 P;

void main() {
  position = a_position;
  vec4 viewSpacePos = V * vec4(a_position, 0.0);
  vec4 clipSpacePos = P * vec4(viewSpacePos.xyz, 1.0);

  gl_Position = clipSpacePos.xyww;
}
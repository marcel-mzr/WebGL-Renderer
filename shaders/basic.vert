#version 300 es
precision mediump float;

in vec2 a_position;
in vec3 a_color;

out vec3 color;

uniform mat4 MVP;

void main() {
  color = a_color;

  vec4 obj_space_pos = vec4(a_position, 0.0, 1.0); 

  gl_Position = MV * obj_space_pos;
}
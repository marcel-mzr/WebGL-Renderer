#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

out vec4 out_color;

uniform sampler2D forward_render;
uniform float exposure;
uniform bool should_tone_map;
uniform bool should_gamma_correct;

vec3 acesToneMapping(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 final_color = exposure * texture(forward_render, uv).rgb;

  if (should_tone_map) {
    // HDR -> LDR
    final_color = acesToneMapping(final_color);
  }
  if (should_gamma_correct) {
    // Transform color back from linear color space to gamma space
    final_color = pow(final_color, vec3(1.0/2.2));
  }
  out_color = vec4(final_color, 1.0);
}
#version 300 es
precision highp float;

const float PI = 3.14159265359;

in vec3 position;

out vec4 frag_color;

uniform samplerCube environment_map;

void main() {
  vec3 sampling_normal = normalize(position);
  vec3 bitangent = vec3(0.0, 1.0, 0.0);
  vec3 tangent = normalize(cross(bitangent, sampling_normal));
  bitangent = normalize(cross(sampling_normal, tangent));

  float sampling_delta = 0.025;
  int sample_count = 0;
  vec3 irradiance = vec3(0.0);

  mat3 TBN = mat3(tangent, bitangent, sampling_normal);

  // Convolute the environment map
  for (float phi = 0.0; phi < 2.0 * PI; phi += sampling_delta) {
    for (float theta = 0.0; theta < 0.5 * PI; theta += sampling_delta) {
      
      vec3 tangent_space_sample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
      vec3 sample_vec = TBN * tangent_space_sample;

      irradiance += texture(environment_map, sample_vec).rgb * cos(theta) * sin(theta);
      sample_count++;
    }
  }
  irradiance = PI * irradiance * (1.0/float(sample_count));

  frag_color = vec4(irradiance, 1.0);
}
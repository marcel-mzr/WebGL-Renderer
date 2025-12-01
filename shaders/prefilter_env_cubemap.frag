#version 300 es
precision highp float;

const float PI = 3.14159265359;

in vec3 position;

out vec4 frag_color;

uniform samplerCube environment_map;
uniform float roughness;
uniform float resolution;

/**
 * Calculates the Van Der Corput radical inverse (mirror at decimal point) of the bits given
 */
float radicalInverse(uint bits) {
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return float(bits) * 2.3283064365386963e-10;
}

/**
 * Calculates the i-th value of the Hammersley Sequence of N values.
 */ 
vec2 hammersley(uint i, uint N) {
  return vec2(float(i)/float(N), radicalInverse(i));
}

/**
 * Samples a halfway vector with a 2d sampled uniform random variable xi,
 * depending on the roughness value that induces the microsuface normal orientation.
 */
vec3 importanceSampleGGX(vec2 xi, vec3 N, float roughness) {
  float alpha = roughness * roughness;
  
  float phi = 2.0 * PI * xi.x;
  float cos_theta = sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y));
  float sin_theta = sqrt(1.0 - cos_theta * cos_theta);

  vec3 H = vec3(cos(phi) * sin_theta, sin(phi) * sin_theta, cos_theta);

  // Construct TBN to transform to world space:
  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, N));
  vec3 bitangent = cross(N, tangent);

  mat3 TBN = mat3(tangent, bitangent, N);
  return normalize(TBN * H);
}

/**
 * Statistical approximation of how many halfway vectors point in the direction of the normal.
 *
 * N - The normal vector
 * H - The halfway vector
 * roughness - The roughness value of the fragment
 */
float normalDistributionGGX(vec3 N, vec3 H, float roughness) {
  // Calculate alpha from roughness (perceptual roughness -> alpha)
  float alpha = roughness * roughness;
  float alpha_squared = alpha * alpha;

  float dot_n_h = max(dot(N, H), 0.0);
  float dot_n_h_squared = dot_n_h * dot_n_h;

  float part_denom = dot_n_h_squared * (alpha_squared - 1.0) + 1.0;
  float denominator = PI * part_denom * part_denom;

  return alpha_squared / denominator;
}

void main() {
  vec3 N = normalize(position);
  vec3 R = N;
  vec3 V = R;

  const uint SAMPLE_COUNT = 1024u;
  float total_weight = 0.0;
  vec3 prefiltered_color = vec3(0.0);

  for (uint i = 0u; i < SAMPLE_COUNT; ++i) {
    vec2 xi = hammersley(i, SAMPLE_COUNT);
    vec3 H = importanceSampleGGX(xi, N, roughness);
    vec3 L = reflect(-V, H);

    float dot_N_L = max(dot(N, L), 0.0);
    // Check if light direction is in hemisphere
    if (dot_N_L > 0.0) {

      float D = normalDistributionGGX(N, H, roughness);
      float dot_N_H = max(dot(N, H), 0.0);
      float dot_H_V = max(dot(H, V), 0.0);
      float pdf = D * dot_N_H / (4.0 * dot_H_V) + 0.0001;

      float solid_angle_texel = 4.0 * PI / (6.0 * resolution * resolution);
      float solid_angle_sample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);

      float mip_level = roughness == 0.0 ? 0.0 : 0.5 * log2(solid_angle_sample / solid_angle_texel);

      prefiltered_color += textureLod(environment_map, L, mip_level).rgb * dot_N_L;
      total_weight += dot_N_L;
    }
  }

  prefiltered_color /= total_weight;
  frag_color = vec4(prefiltered_color, 1.0);
}
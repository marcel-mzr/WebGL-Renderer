#version 300 es
precision highp float;

// Constants
const float PI = 3.14159265359;

in vec2 uv;

out vec2 frag_color;

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

/**
 * A statistical approximation of how much light gets blocked by 
 * geometry obstruction and geometry shadowing.
 * 
 * N - The normal vector
 * V - The vector pointing to a light source or to the camera (depending on usage)
 * roughness - the roughness value of the fragment
 */
float geometrySchlickGGX(vec3 N, vec3 V, float roughness) {
  // use perceptual roughness in the schlick geometry approximation
  float alpha = roughness;
  float k = (alpha * alpha) / 2.0;

  float dot_N_V = max(dot(N, V), 0.0);
  float denominator = dot_N_V * (1.0 - k) + k;

  return dot_N_V / denominator;
}

/**
 * Combines geometry obstruction and geometry shadowing.
 * 
 * N - The normal vector
 * V - The vector pointing to the camera
 * L - The vector pointing to the light source
 * roughness - the roughness value of the fragment
 */
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float geo_obstruction = geometrySchlickGGX(N, V, roughness);
  float geo_shadowing = geometrySchlickGGX(N, L, roughness);
  return geo_obstruction * geo_shadowing;
}

vec2 integrateBRDF(float dot_N_V, float roughness)
{
  vec3 V;
  V.x = sqrt(1.0 - dot_N_V * dot_N_V);
  V.y = 0.0;
  V.z = dot_N_V;

  float A = 0.0;
  float B = 0.0;

  vec3 N = vec3(0.0, 0.0, 1.0);

  const uint SAMPLE_COUNT = 1024u;
  for(uint i = 0u; i < SAMPLE_COUNT; ++i)
  {
    vec2 xi = hammersley(i, SAMPLE_COUNT);
    vec3 H  = importanceSampleGGX(xi, N, roughness);
    vec3 L  = normalize(2.0 * dot(V, H) * H - V);

    float dot_N_L = max(L.z, 0.0);
    float dot_N_H = max(H.z, 0.0);
    float dot_V_H = max(dot(V, H), 0.0);

    if(dot_N_L > 0.0)
    {
      float G = geometrySmith(N, V, L, roughness);
      float G_Vis = (G * dot_V_H) / (dot_N_H * dot_N_V);
      float Fc = pow(1.0 - dot_V_H, 5.0);

      A += (1.0 - Fc) * G_Vis;
      B += Fc * G_Vis;
    }
  }
  A /= float(SAMPLE_COUNT);
  B /= float(SAMPLE_COUNT);
  return vec2(A, B);
}


void main() {
  vec2 integratedBRDF = integrateBRDF(uv.x, uv.y);
  frag_color = integratedBRDF;
}
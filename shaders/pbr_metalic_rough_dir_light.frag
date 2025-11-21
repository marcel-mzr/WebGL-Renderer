#version 300 es
precision highp float;

// Constants
#define PI 3.14159265

/*
TODO:
 - add ambient occlusion (read out green channel)
 - add normal mapping
*/


in vec3 normal;
in vec4 tangent;
in vec2 uv;
in vec3 position;

out vec4 outColor;

uniform vec3 camera_position;
// The direction the light rays of the sun travel in
uniform vec3 sun_light_direction; 
uniform vec3 sun_light_color;

uniform sampler2D albedo_map;
uniform sampler2D normal_map;
uniform sampler2D metalness_map;
uniform sampler2D roughness_map;

uniform bool has_albedo_map;
uniform bool has_normal_map;
uniform bool has_metalness_map;
uniform bool has_roughness_map;

// Function declarations:
bool shouldDiscard();
vec3 readOutTBNNormal();
float normalDistributionGGX(vec3 N, vec3 H, float roughness);
float geometrySchlickGGX(vec3 N, vec3 V, float roughness);
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness);
vec3 fresnelSchlick(vec3 H, vec3 V, vec3 F0);

void main() {
  if (shouldDiscard()) {
    discard;
  }

  // Normal vector
  vec3 N = readOutTBNNormal();
  // View vector pointing towards camera
  vec3 V = normalize(camera_position - position);
  // Light direction (towards sun)
  vec3 L = normalize(-sun_light_direction);
  // Halfway vector relative to sunlight direction and view direction
  vec3 H = normalize(L + V);

  // TODO: convert from srgb space to linear color space
  vec3 albedo = texture(albedo_map, uv).rgb;
  albedo = pow(albedo, vec3(2.2));
  float roughness = texture(roughness_map, uv).g;
  float metalness = texture(metalness_map, uv).b;

  // F0 is the base refectivity of a surface
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metalness);
  vec3 light_radiance = sun_light_color;

  // -- Calculate Cook-torrance brdf --
  float NDF = normalDistributionGGX(N, H, roughness);
  float G = geometrySmith(N, V, L, roughness);
  vec3 F = fresnelSchlick(H, V, F0);

  // Calculate diffuse contribution coefficient
  vec3 k_d = (vec3(1.0) - F) * (1.0 - metalness);

  vec3 specular_brdf_num = NDF * G * F;
  float specular_brdf_den = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.00001;

  vec3 specular_brdf = specular_brdf_num / specular_brdf_den;
  vec3 diffuse_brdf = albedo / PI;
  // TODO: change when doing IBL
  vec3 ambient = vec3(0.03) * albedo;
  // Light contribution towards camera
  float dot_N_L = max(dot(N, L), 0.0);
  vec3 LO = (k_d * diffuse_brdf + specular_brdf) * light_radiance * dot_N_L;

  // Calculate final color
  vec3 final_color = LO + ambient;
  // HDR -> LDR
  final_color = final_color / (final_color + vec3(1.0));
  // Transform color back from linear color space to gamma space
  final_color = pow(final_color, vec3(1.0/2.2));

  outColor = vec4(final_color, 1.0);
}

/**
 * Checks if the shader should discard the fragment because of alpha values
 */ 
bool shouldDiscard() {
  return (texture(albedo_map, uv).a == 0.0);
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
  // TODO: change when using IBL 
  float k = ((alpha + 1.0) * (alpha + 1.0)) / 8.0;

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

/**
 * Approximates the fresnel effect.
 *
 * H - The halfway vector
 * V - The vector pointing to the camera
 * F0 - response factor (normal incidence) that happens at a view angle of 0 degree
 */
vec3 fresnelSchlick(vec3 H, vec3 V, vec3 F0) {
  float dot_H_V = max(dot(H, V), 0.0);
  return F0 + (1.0 - F0) * pow(1.0 - dot_H_V, 5.0);
}

vec3 readOutTBNNormal() {
  vec3 N = normalize(normal);
  vec3 T = normalize(vec3(tangent));
  // renormalization of T through gram-schmitt
  T = normalize(T - dot(T, N) * N);

  vec3 B = normalize(cross(N, T) * tangent.w);

  mat3 TBN = mat3(T, B, N);

  vec3 tangent_space_normal = texture(normal_map, uv).xyz * 2.0 - 1.0;
  return normalize(TBN * tangent_space_normal);
}
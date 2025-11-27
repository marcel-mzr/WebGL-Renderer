#version 300 es
precision highp float;

in vec3 normal;
in vec2 uv;
in vec3 position;
in vec4 tangent;

out vec4 outColor;

uniform vec3 camera_position;
// The direction the light rays of the sun travel in
uniform vec3 sun_light_direction; 

uniform sampler2D albedo_map;
uniform sampler2D normal_map;
uniform sampler2D metalness_map;
uniform sampler2D roughness_map;

uniform bool has_albedo_map;
uniform bool has_normal_map;
uniform bool has_metalness_map;
uniform bool has_roughness_map;

void main() {
  vec3 N = normalize(normal);

  vec3 light_position = vec3(2.0, 2.0, 1.0);

  vec3 light_dir = sun_light_direction;

  vec3 albedo = vec3(1.0, 1.0, 1.0);

  if (has_albedo_map) {
    // Discard transparent textures
    if (texture(albedo_map, uv).a == 0.0) {
      discard;
    }

    albedo = texture(normal_map, uv).xyz;
  }



  float light_ambient = 0.2;
  // vec3 light_direction = normalize(light_position - position);
  float light_diffuse = 1.0;

  vec3 ambient_contrib = light_ambient * albedo;
  vec3 diffuse_contrib = max(dot(N, -light_dir), 0.0) * light_diffuse * albedo;

  outColor = vec4(ambient_contrib + diffuse_contrib, 1.0);
  // outColor = texture(albedo_map, uv);
}
#version 300 es
precision highp float;


in vec3 normal;
in vec2 uv;
in vec3 position;

out vec4 outColor;

uniform sampler2D albedo_texture;
uniform bool has_albedo_texture;

void main() {
  vec3 N = normalize(normal);

  vec3 light_position = vec3(2.0, 2.0, 1.0);

  vec3 albedo = vec3(1.0, 1.0, 1.0);

  if (has_albedo_texture) {
    // Discard transparent textures
    if (texture(albedo_texture, uv).a == 0.0) {
      discard;
    }

    albedo = texture(albedo_texture, uv).xyz;
  }



  float light_ambient = 0.2;
  vec3 light_direction = normalize(light_position - position);
  float light_diffuse = 1.0;

  vec3 ambient_contrib = light_ambient * albedo;
  vec3 diffuse_contrib = max(dot(N, light_direction), 0.0) * light_diffuse * albedo;

  outColor = vec4(ambient_contrib + diffuse_contrib, 1.0);
  // outColor = texture(albedo_texture, uv);
}
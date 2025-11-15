#version 300 es
precision highp float;

in vec3 normal;
in vec2 uv;
in vec3 position;

out vec4 outColor;

uniform sampler2D diffuse_texture;
uniform sampler2D specular_texture;

uniform vec3 light_position;
uniform vec3 camera_position;

void main() {
  vec3 N = normalize(normal);

  vec3 light_color = vec3(1.0, 1.0, 1.0);
  float ambient_strength = 0.1;
  vec3 ambient = ambient_strength * light_color;

  vec3 light_direction = normalize(light_position - position);
  vec3 diffuse = max(dot(N, light_direction), 0.0) * light_color;

  vec3 camera_direction = normalize(camera_position - position);
  vec3 reflected_direction = reflect(-light_direction, N);

  float specular_strength = 1.0;
  vec3 specular = pow(max(dot(camera_direction, reflected_direction), 0.0), 32.0) * specular_strength * light_color;

  vec3 albedo = texture(diffuse_texture, uv).rgb;

  outColor = vec4(albedo * (ambient + diffuse + specular), 1.0);
}
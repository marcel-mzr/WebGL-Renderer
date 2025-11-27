#version 300 es
precision highp float;

struct Material {
  sampler2D diffuse;
  sampler2D specular;
  float shininess;
};

struct Light {
  vec3 position;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
}; 

in vec3 normal;
in vec2 uv;
in vec3 position;

out vec4 outColor;

uniform Light light;
uniform Material material;

uniform vec3 camera_position;

void main() {
  vec3 N = normalize(normal);

  vec3 diffuse_mat_color = texture(material.diffuse, uv).rgb;
  vec3 specular_mat_color = texture(material.specular, uv).rgb;
  vec3 light_direction = normalize(light.position - position);
  vec3 camera_direction = normalize(camera_position - position);
  vec3 R = reflect(-light_direction, N);

  vec3 ambient_contrib = diffuse_mat_color * light.ambient;
  vec3 diffuse_contrib = max(dot(N, light_direction), 0.0) * light.diffuse * diffuse_mat_color;
  vec3 specular_contrib = pow(max(dot(camera_direction, R), 0.0), material.shininess) * light.specular * specular_mat_color;

  outColor = vec4(ambient_contrib + diffuse_contrib + specular_contrib, 1.0);
}
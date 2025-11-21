import { vec3 } from "gl-matrix";

/**
 * A lightsource which emmits paralell light rays and therefore is independent of direction.
 */
export class DirectionalLight {
  
  /**
   * @param {vec3} direction - The direction the light is pointing to
   * @param {vec3} color - The color of the light
   * @param {number} intensity - The intensity of the light
   */
  constructor(direction, color, intensity) {
    /** @type {vec3} */
    this.direction = direction;
    /** @type {vec3} */
    this.radiance = vec3.create();
    vec3.scale(this.radiance, color, intensity);
  }

  getDirection() {
    return this.direction;
  }

  getRadiance() {
    return this.radiance;
  }
}
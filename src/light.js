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
    this.direction = direction;
    this.color = color;

    /** @type {vec3} */
    this.radiance = vec3.create();
    vec3.scale(this.radiance, color, intensity);
  }

  /**
   * 
   * @param {vec3} direction 
   */
  setDirection(direction) {
    vec3.copy(this.direction, direction);
  }

  /**
   * 
   * @param {number} intensity 
   */
  setIntensity(intensity) {
    vec3.scale(this.radiance, this.color, intensity);
  }

  getDirection() {
    return this.direction;
  }

  getRadiance() {
    return this.radiance;
  }
}
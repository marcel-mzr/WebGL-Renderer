import { mat4, vec3 } from "gl-matrix";

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
   * Calculates the view position of the sun looking at the origin.
   * @param {number} distance the distance from the origin to the light sources position
   */
  calcViewMatrix(distance) {
    var viewPos = vec3.create();
    vec3.scale(viewPos, this.direction, -distance);

    var view = mat4.create();
    mat4.lookAt(view, viewPos, vec3.fromValues(0, 0, 0), vec3.fromValues(0.0, 1.0, 0.0));
    return view;
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
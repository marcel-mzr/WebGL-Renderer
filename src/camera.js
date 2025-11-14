import { vec3, mat4 } from "gl-matrix";

export class Camera {

  constructor(inputHandler, aspectRatio) {
    this.aspectRatio = aspectRatio;
    this.inputHandler = inputHandler;

    this.fov = 45 * Math.PI / 180;
    this.worldUp = vec3.fromValues(0.0, 1.0, 0.0);

    /**
     * The Point that the camera looks at
     * @type {vec3}
     */
    this.cameraTarget = vec3.fromValues(0.0, 0.0, 0.0);
    /**
     * The Position of the camera in world coordinates
     * @type {vec3}
     */
    this.cameraPosition = vec3.create();
    
    /**
     * The camera direction pointing towards -z in the camera coordinate system
     * @type {vec3}
     */
    this.cameraDirection = vec3.create();

    /**
     * The direction that points to the right of the camera
     * @type {vec3}
     */
    this.cameraRight = vec3.create();
    /**
     * The direction that points in to cameras up direction
     */
    this.cameraUp = vec3.create();

    /**
     * The view matrix to map from world space to view space;
     */
    this.view = mat4.create();

    /** 
     * The projection matrix to map from view space to clip space
     * @type {mat4}
    */
    this.projection = mat4.create();
    mat4.perspective(this.projection, this.fov, this.aspectRatio, 0.1, 100);

    /**
     * The projection * view matrix buffer to avoid garbage collection
     */
    this.viewProjection = mat4.create();

    this.azimuth = Math.PI / 2;
    this.zenith = Math.PI / 2;

    this.calculateCameraParameters(this.azimuth, this.zenith, 5.0) 
  }

  /**
   * (Re-)calculates the parameters of the camera relative to the azimuth and zenith angle
   * @param {number} azimuth - The azimuth angle in radians
   * @param {number} zenith - The zenith angle in radians
   * @param {number} distance - The distance to the cameras taget
   */
  calculateCameraParameters(azimuth, zenith, distance) {
    this.distance = distance;
    this.azimuth = azimuth;
    this.zenith = zenith;

    // (Re-)calculate camera position
    vec3.set(this.cameraPosition, 
      this.cameraTarget[0] + this.distance * Math.sin(zenith) * Math.cos(azimuth),
      this.cameraTarget[1] + this.distance * Math.cos(zenith),
      this.cameraTarget[2] + this.distance * Math.sin(zenith) * Math.sin(azimuth)
    );

    // console.log(`Camera Position: [${this.cameraPosition[0]}, ${this.cameraPosition[1]}, ${this.cameraPosition[2]}]`);

    // (Re-)calculate camera direction
    vec3.sub(this.cameraDirection, this.cameraPosition, this.cameraTarget);
    vec3.normalize(this.cameraDirection, this.cameraDirection);

    // (Re-)calculate the right direction of the camera
    vec3.cross(this.cameraRight, this.worldUp, this.cameraDirection);
    vec3.normalize(this.cameraRight, this.cameraRight);

    // (Re-)calculate the up direction of the camera
    vec3.cross(this.cameraUp, this.cameraDirection, this.cameraRight);
    vec3.normalize(this.cameraUp, this.cameraUp);

    // (Re)-calculate matrices
    mat4.lookAt(this.view, this.cameraPosition, this.cameraTarget, this.worldUp);
    mat4.mul(this.viewProjection, this.projection, this.view);
  }

  getViewProjectionMatrix() {
    return this.viewProjection;
  }

}
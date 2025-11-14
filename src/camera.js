import { vec3, mat4 } from "gl-matrix";
import { InputHandler } from "./input";

export class Camera {

  /**
   * 
   * @param {InputHandler} inputHandler 
   * @param {*} aspectRatio 
   */
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
    this.distance = 5.0;

    // Camera restrictions
    this.minZenith = 0.01;
    this.maxZenith = Math.PI - this.minZenith;
    this.minDistance = 0.0;
    this.maxDistance = 100.0;


    this.updateCameraParameters(this.azimuth, this.zenith, this.distance);
    this.registerCallbacks();

    // Mouse parameters
    this.mouseSpeed = 0.01;
    this.mouseDown = false;
    this.mouseDownX = 0;
    this.mouseDownY = 0;

    // Wheel parameters
    this.wheelSpeed = 0.003;
  }

  /**
   * (Re-)calculates the parameters of the camera relative to the azimuth and zenith angle
   * @param {number} azimuth - The azimuth angle in radians
   * @param {number} zenith - The zenith angle in radians
   * @param {number} distance - The distance to the cameras taget
   */
  updateCameraParameters(azimuth, zenith, distance) {


    // (Re-)calculate camera position
    vec3.set(this.cameraPosition, 
      this.cameraTarget[0] + distance * Math.sin(zenith) * Math.cos(azimuth),
      this.cameraTarget[1] + distance * Math.cos(zenith),
      this.cameraTarget[2] + distance * Math.sin(zenith) * Math.sin(azimuth)
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

  registerCallbacks() {
    this.inputHandler.subscribe("pointerup", (event) => this.onPointerUp(event));
    this.inputHandler.subscribe("pointerdown", (event) => this.onPointerDown(event));
    this.inputHandler.subscribe("pointermove", (event) => this.onPointerMove(event));
    this.inputHandler.subscribe("pointercancel", (event) => this.onPointerCancel(event));
    this.inputHandler.subscribe("wheel", (event) => this.onWheel(event));
  }

  /**
   * pointerup callback
   * @param {PointerEvent} event 
   */
  onPointerUp(event) {
    this.mouseDown = false;

    const deltaX = event.clientX - this.mouseDownX;
    const deltaY = event.clientY - this.mouseDownY;

    this.azimuth = this.azimuth + deltaX * this.mouseSpeed;
    this.zenith = this.zenith - deltaY * this.mouseSpeed;

    this.zenith = Math.max(this.minZenith, this.zenith);
    this.zenith = Math.min(this.maxZenith, this.zenith);

    this.updateCameraParameters(this.azimuth, this.zenith, this.distance);
  }

  /**
   * pointerdown callback
   * @param {PointerEvent} event 
   */
  onPointerDown(event) {
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.mouseDown = true;
  }

  /**
   * pointermove callback
   * @param {PointerEvent} event 
   */
  onPointerMove(event) {
    if (!this.mouseDown) return;

    const deltaX = event.clientX - this.mouseDownX;
    const deltaY = event.clientY - this.mouseDownY;

    var azimuth = this.azimuth + deltaX * this.mouseSpeed;
    var zenith = this.zenith - deltaY * this.mouseSpeed;

    zenith = Math.max(this.minZenith, zenith);
    zenith = Math.min(this.maxZenith, zenith);


    this.updateCameraParameters(azimuth, zenith, this.distance);
  }

  /**
   * pointercancel callback
   * @param {PointerEvent} event 
   */
  onPointerCancel(event) {
    this.mouseDown = false;
    this.updateCameraParameters(this.azimuth, this.zenith, this.distance);
  }

  /**
   * wheel callback
   * @param {WheelEvent} event 
   */
  onWheel(event) {

    this.distance = this.distance + event.deltaY * this.wheelSpeed;

    this.distance = Math.min(this.maxDistance, this.distance);
    this.distance = Math.max(this.minDistance, this.distance);

    this.updateCameraParameters(this.azimuth, this.zenith, this.distance);
  }

}
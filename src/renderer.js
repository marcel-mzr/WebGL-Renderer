import { vec3 } from "gl-matrix";
import { DirectionalLight } from "./light";
import { Model } from "./scene-datastructures";
import { Skybox } from "./skybox";
import { Shader } from "./shader";
import { Camera } from "./camera";
import { createSimpleCubeMesh } from "./simple-mesh";

export class Renderer {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   * @param {Camera} camera - the camera to render the scene from
   */
  constructor(gl, camera) {
    this.gl = gl;
    this.camera = camera;

    this.renderingOptions = new RenderingOptions();

    this.model = new Model(this.gl, "assets/survival_guitar_backpack/scene.gltf", this.renderingOptions);
    this.skybox = new Skybox(this.gl, "assets/fishermans_bastion_skybox");

    const lightDirection = vec3.fromValues(-2.0, -2.0, -2.0);
    vec3.normalize(lightDirection, lightDirection);

    this.sun = new DirectionalLight(lightDirection, vec3.fromValues(1.0, 0.94, 0.84), 5.0);

    // Construct Light Indicator mesh
    this.lightIndicatorMesh = createSimpleCubeMesh(this.gl, "assets/white.png", "assets/white.png");
    this.lightIndicatorMesh.setPosition(lightDirection)
    const lightIndicatorPosition = vec3.create();
    const lightIndicatorDistance = 5.0;
    vec3.scale(lightIndicatorPosition, lightDirection, -lightIndicatorDistance);
    this.lightIndicatorMesh.setPosition(lightIndicatorPosition);

    // Construct shaders
    this.lightIndiatorShader = new Shader(this.gl, "shaders/light.vert", "shaders/light.frag");
    this.skyboxShader = new Shader(this.gl, "shaders/skybox.vert", "shaders/skybox.frag");
    this.pbrShader = new Shader(this.gl, "shaders/pbr_metalic_rough_dir_light.vert", "shaders/pbr_metalic_rough_dir_light.frag");

    /** Variable to signal the stop of the render loop*/
    this.shouldRender = true;
  }

  /**
   * - Loads the Shaders
   * - Initializes the scene to render
   */
  async init() {
    await this.lightIndiatorShader.init();
    await this.skyboxShader.init();
    await this.pbrShader.init();

    await this.skybox.load();
    await this.model.load();
    await this.lightIndicatorMesh.load();

    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /**
   * Starts the render loop
   */
  render() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const V = this.camera.getViewMatrix();
    const P = this.camera.getProjectionMatrix();
    const VP = this.camera.getViewProjectionMatrix();

    // Render the model:
    this.pbrShader.use();
    this.pbrShader.setMat4("VP", VP);
    this.pbrShader.setVec3("camera_position", this.camera.getPosition());
    this.pbrShader.setVec3("sun_light_direction", this.sun.getDirection());
    // Render the sun if enabled
    if (this.renderingOptions.shouldRenderSun) {
      this.pbrShader.setVec3("sun_light_color", this.sun.getRadiance());
    } else {
      this.pbrShader.setVec3("sun_light_color", vec3.fromValues(0.0, 0.0, 0.0));
    }
    this.model.draw(this.pbrShader);

    // Render the light direction indicator
    this.lightIndiatorShader.use();
    this.lightIndiatorShader.setMat4("VP", VP);
    this.lightIndicatorMesh.draw(this.lightIndiatorShader);

    // Render the skybox
    if (this.renderingOptions.shouldRenderEnvironmentMap) {
      this.skyboxShader.use();
      this.skyboxShader.setMat4("V", V);
      this.skyboxShader.setMat4("P", P);
      this.skybox.draw(this.skyboxShader);
    }

    // Request next animation frame
    if (this.shouldRender) {
      requestAnimationFrame(() => this.render());
    }
  }

  /**
   * Sets the size of the viewport
   * @param {number} width 
   * @param {number} height 
   */
  setViewPortDimensions(width, height) {
    this.gl.viewport(0, 0, width, height);

    this.camera.updateAspectRatio(width / height);
  }

  /**
   * Updates the suns direction to match the viewing direction of the camera
   */
  setSunDirectionToCameraViewDirection() {
    var newDirection = vec3.create();
    vec3.scale(newDirection, this.camera.getPosition(), -1);
    vec3.normalize(newDirection, newDirection);

    this.sun.setDirection(newDirection);
  }

  /**
   * Updates the intensity of the sun
   */
  setSunIntensity(intensity) {
    this.sun.setIntensity(intensity);
  }

  /**
   * Loads a new model given a path
   * @param {string} path 
   */
  async loadModelByPath(path) {
    const newModel = new Model(this.gl, path, this.renderingOptions);
    await newModel.load();
    this.model = newModel;
  }

  getModel() {
    return this.model;
  }
}

export class RenderingOptions {
  constructor() {
    this.shouldRenderEnvironmentMap = true;
    this.shouldRenderShadows = true;
    this.shouldDoAo = true;
    this.shouldNormalMap = true;
    this.shouldDoIbl = true;
    this.shouldTonemap = true;
    this.shouldAlphaCorrect = true;
    this.shouldRenderSun = true;
  }
}
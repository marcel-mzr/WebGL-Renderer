import { vec3, mat4 } from "gl-matrix";
import { DirectionalLight } from "./light";
import { Model } from "./scene-datastructures";
import { Skybox } from "./skybox";
import { Shader } from "./shader";
import { Camera } from "./camera";
import { createSimpleCubeMesh } from "./simple-mesh";
import { DepthMapFramebuffer, Framebuffer } from "./framebuffer";
import { NDCQuad } from "./post-processing-quad";

// Define rendering modes
const RENDERING_MODE_STANDARD = 0;
const RENDERING_MODE_DEPTH_SUN = 1;

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

    this.model = new Model(this.gl, "assets/models/lion_head_4k/lion_head_4k.gltf", this.renderingOptions);
    this.skybox = new Skybox(this.gl, "assets/environment_maps/fishermans_bastion_skybox");
    this.envColor = vec3.create();

    const lightDirection = vec3.fromValues(-2.0, -2.0, -2.0);
    vec3.normalize(lightDirection, lightDirection);
    this.sun = new DirectionalLight(lightDirection, vec3.fromValues(1.0, 0.94, 0.84), 5.0);

    this.lightSpaceMatrix = null;
    this.updateLightSpaceMatrix(1.0);

    this.screenQuad = new NDCQuad(this.gl);
    
    this.forwardPassFramebuffer = new Framebuffer(this.gl, this.gl.canvas.width, this.gl.canvas.height);
    this.depthMapFramebuffer = new DepthMapFramebuffer(this.gl, 4096, 4096);

    // Construct shaders
    this.lightIndiatorShader = new Shader(this.gl, "shaders/light.vert", "shaders/light.frag");
    this.skyboxShader = new Shader(this.gl, "shaders/skybox.vert", "shaders/skybox.frag");
    this.pbrShader = new Shader(this.gl, "shaders/pbr_metalic_rough_dir_light.vert", "shaders/pbr_metalic_rough_dir_light.frag");
    this.postProcessingShader = new Shader(this.gl, "shaders/post_processing.vert", "shaders/post_processing.frag");
    this.depthMapShader = new Shader(this.gl, "shaders/depth_map.vert", "shaders/depth_map.frag");
    this.depthMapToScreenQuadShader = new Shader(this.gl, "shaders/depth_map_to_screen_quad.vert", "shaders/depth_map_to_screen_quad.frag");

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
    await this.postProcessingShader.init();
    await this.depthMapShader.init();
    await this.depthMapToScreenQuadShader.init();

    await this.skybox.load();
    await this.model.load();

    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /**
   * Starts the render loop
   */
  render() {
    if (this.renderingOptions.renderingMode == RENDERING_MODE_STANDARD) {
      this.renderStandardFrame();
    }
    else if (this.renderingOptions.renderingMode == RENDERING_MODE_DEPTH_SUN) {
      this.renderDepthSunFrame();
    }

    // Request next animation frame
    if (this.shouldRender) {
      requestAnimationFrame(() => this.render());
    }
  }


  /**
   * Rendering in the standard rendering mode capturing from the camera
   */
  renderStandardFrame() {
    if (this.renderingOptions.shouldRenderShadows) {
      this.renderDepthMapFromSun();
    }
    this.renderForwardPass();
    this.renderPostProcessing();
  }

  /**
   * Render the scene from the perspective of the sun in orthographic manner, capturing the depth map.
   */
  renderDepthSunFrame() {
    this.renderDepthMapFromSun();

    // Depth map to screen quad
    this.depthMapToScreenQuadShader.use();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.depthMapToScreenQuadShader.setInt("depth_map", 0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthMapFramebuffer.getDepthMapTexture());

    this.screenQuad.draw();
  }

  renderForwardPass() {
    const V = this.camera.getViewMatrix();
    const P = this.camera.getProjectionMatrix();
    const VP = this.camera.getViewProjectionMatrix();

    // - Render the forward pass -
    this.forwardPassFramebuffer.enable();
    this.gl.clearColor(this.envColor[0], this.envColor[1], this.envColor[2], 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    // Render the model:
    this.pbrShader.use();
    this.pbrShader.setMat4("VP", VP);
    this.pbrShader.setMat4("light_space_matrix", this.lightSpaceMatrix);
    this.pbrShader.setVec3("camera_position", this.camera.getPosition());
    this.pbrShader.setVec3("sun_light_direction", this.sun.getDirection());
    // Input depth texture as shadow map
    this.gl.activeTexture(this.gl.TEXTURE10);

    // Set shadow map uniforms
    if (this.renderingOptions.shouldRenderShadows) {
      this.pbrShader.setBool("should_render_shadows", true);
      this.pbrShader.setInt("shadow_map", 10);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthMapFramebuffer.getDepthMapTexture());
    } else {
      this.pbrShader.setBool("should_render_shadows", false);
    }

    // Render the sun if enabled
    if (this.renderingOptions.shouldRenderSun) {
      this.pbrShader.setVec3("sun_light_color", this.sun.getRadiance());
    } else {
      this.pbrShader.setVec3("sun_light_color", vec3.fromValues(0.0, 0.0, 0.0));
    }
    this.model.draw(this.pbrShader);

    // Render the skybox
    if (this.renderingOptions.shouldRenderEnvironmentMap) {
      this.skyboxShader.use();
      this.skyboxShader.setMat4("V", V);
      this.skyboxShader.setMat4("P", P);
      this.skybox.draw(this.skyboxShader);
    }
    this.forwardPassFramebuffer.disable();
  }

  /** 
   * Renders the skybox if enabled 
   */
  renderSkybox() {
    if (this.renderingOptions.shouldRenderEnvironmentMap) {
      this.skyboxShader.use();
      this.skyboxShader.setMat4("V", V);
      this.skyboxShader.setMat4("P", P);
      this.skybox.draw(this.skyboxShader);
    }
  }

  renderPostProcessing() {
    this.postProcessingShader.use();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.postProcessingShader.setInt("forward_render", 0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.forwardPassFramebuffer.getColorBufferTexture());

    this.screenQuad.draw();
  }

  /**
   * Renders the depth map from the sun's view direction into the depth map framebuffer
   */
  renderDepthMapFromSun() {
    const canvasWidth = this.gl.canvas.width;
    const canvasHeight = this.gl.canvas.height;

    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.cullFace(this.gl.FRONT);
    this.depthMapFramebuffer.enable();
    this.depthMapShader.use();
    this.depthMapShader.setMat4("light_space_matrix", this.lightSpaceMatrix);
    this.model.draw(this.depthMapShader);
    this.gl.cullFace(this.gl.BACK);
    this.depthMapFramebuffer.disable(canvasWidth, canvasHeight);
  }

  /**
   * Sets the size of the viewport
   * @param {number} width 
   * @param {number} height 
   */
  setViewPortDimensions(width, height) {
    this.gl.viewport(0, 0, width, height);

    this.camera.updateAspectRatio(width / height);
    this.forwardPassFramebuffer.resize(width, height);
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
   * @param {number} modelScale 
   */
  updateLightSpaceMatrix(modelScale) {
    const halfSize = 2 * modelScale;
    var sunProjection = mat4.create();
    mat4.ortho(sunProjection, -halfSize, halfSize, -halfSize, halfSize, 0.1 * modelScale, 10.0 * modelScale);
    const sunView = this.sun.calcViewMatrix(2 * modelScale);

    this.lightSpaceMatrix = mat4.create();
    mat4.mul(this.lightSpaceMatrix, sunProjection, sunView);
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

  /**
   * Loads in a environment map by path
   * @param {string} path 
   */
  async loadEnvByPath(path) {
    const shouldRenderEnv = this.renderingOptions.shouldRenderEnvironmentMap;
    this.renderingOptions.shouldRenderEnvironmentMap = false;

    const newSkybox = new Skybox(this.gl, path);
    await newSkybox.load();
    this.skybox.delete();
    this.skybox = newSkybox;

    this.renderingOptions.shouldRenderEnvironmentMap = shouldRenderEnv; 
  }

  getModel() {
    return this.model;
  }

  /**
   *
   * @param {vec3} color 
   */
  setEnvColor(color) {
    this.envColor = color;
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
    this.shouldGammaCorrect = true;
    this.shouldRenderSun = true;

    this.renderingMode = RENDERING_MODE_STANDARD;
  }
}
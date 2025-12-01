import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader";
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { NDCQuad } from "./post-processing-quad";

export class HDRCubeMap {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   * @param {string} hdriPath - The path the the HDR Image
   */
  constructor(gl, hdriPath) {
    this.ENV_CUBEMAP_WIDTH = 1024; // TODO: maybe change to something lower
    this.IRRADIANCE_CUBEMAP_WIDTH = 32;
    this.PREFILTERED_CUBEMAP_WIDTH = 512;
    this.PREFILTERED_CUBEMAP_MIPMAP_LEVELS = 5;
    this.BRDF_LUT_TEXTURE_WIDTH = 512;

    this.gl = gl;
    this.hdriPath = hdriPath;

    this.skybox = new Skybox(this.gl);;
    this.environmentCube = new EnvironmentMapCube(this.gl);
    this.screenQuad = new NDCQuad(this.gl);

    const extBuffer = this.gl.getExtension("EXT_color_buffer_float");
    if (!extBuffer) console.warn("EXT_color_buffer_float not supported! Cubemap generation might fail.");

    // Required to use LINEAR filtering on float textures
    const extLinear = this.gl.getExtension("OES_texture_float_linear");
    if (!extLinear) console.warn("OES_texture_float_linear not supported! Result might look blocky.");

    /** @type {WebGLTexture} */
    this.envCubemapTexture = null;
    /** @type {WebGLTexture} */
    this.irradianceCubemapTexture = null;
    /** @type {WebGLTexture} */
    this.prefilteredEnvCubemapTexture = null;
    /** @type {WebGLTexture} */
    this.brdfLUTTexture = null;

    /**
     * @type {WebGLTexture}
     */
    this.hdriTexture = null;

    /**
     * The framebuffer that captures the cubemap of the hdri
     * @type {WebGLFramebuffer}
     */
    this.cubemapCaptureFramebuffer = null;
    /**
     * @type {WebGLRenderbuffer}
     */
    this.cubemapCaptureRenderbuffer = null;

    // Transforms
    this.cubemapCaptureViewMatrices = this.setupCubemapCaptureViewMatrices();
    this.cubemapCaptureProjectionMatrix = mat4.create();
    mat4.perspective(this.cubemapCaptureProjectionMatrix, Math.PI / 2.0, 1.0, 0.1, 10.0);

    // Shaders
    this.equirectangularToCubemapShader = new Shader(this.gl, "shaders/equirectangular_to_cubemap.vert", "shaders/equirectangular_to_cubemap.frag");
    this.envToIrradianceCubemapShader = new Shader(this.gl, "shaders/env_to_irradiance_cubemap.vert", "shaders/env_to_irradiance_cubemap.frag");
    this.prefilterEnvCubemapShader = new Shader(this.gl, "shaders/prefilter_env_cubemap.vert", "shaders/prefilter_env_cubemap.frag");
    this.brdfIntegrationMapShader = new Shader(this.gl, "shaders/brdf_integration_map.vert", "shaders/brdf_integration_map.frag");
  }

  async init() {
    const hdrImage = await this.loadHDRIData(this.hdriPath);
    this.setupHDRITexture(hdrImage);
  
    await this.equirectangularToCubemapShader.init();
    await this.envToIrradianceCubemapShader.init();
    await this.prefilterEnvCubemapShader.init();
    await this.brdfIntegrationMapShader.init();

    this.createEnvironmentCubemap();

    this.createIrradianceMap();
    this.createPrefilteredEnvCubemap();
    this.createBrdfLUTTexture();

    this.skybox.loadByTexture(this.envCubemapTexture);
  }

  /**
   * Draws the skybox of the cubemap
   * @param {Shader} skyboxShader 
   */
  draw(skyboxShader) {
    this.skybox.draw(skyboxShader);
  }

  delete() {
    this.skybox.delete();
    this.gl.deleteFramebuffer(this.cubemapCaptureFramebuffer);
    this.gl.deleteRenderbuffer(this.cubemapCaptureRenderbuffer)
    this.gl.deleteTexture(this.envCubemapTexture);
  }

  /**
   * Captures all 6 sides of a cubemap given a shader and a cube face size and stores the result in the supplied cubemap texture
   * @param {Shader} shader - the shader to be used for rendering the faces
   * @param {number} faceWidth - the Width of one quadratic face
   * @param {WebGlTexture} cubemapTexture - The cubemap texture to render to
   * @param {number} mipmapLevel - The level of the mipmap to render to
   */
  createCubemap(shader, faceWidth, cubemapTexture, mipmapLevel = 0) {
    const viewportParameters = this.gl.getParameter(this.gl.VIEWPORT);
    const oldWidth = viewportParameters[2];
    const oldHeight = viewportParameters[3];
    
    this.gl.viewport(0, 0, faceWidth, faceWidth);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.cubemapCaptureFramebuffer);

    shader.setMat4("P", this.cubemapCaptureProjectionMatrix);
    for (var i = 0; i < 6; ++i) {
      shader.setMat4("V", this.cubemapCaptureViewMatrices[i]);
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cubemapTexture, mipmapLevel
      );
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      this.environmentCube.draw();
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, oldWidth, oldHeight);
  }

  /**
   * Creates the cubemap that is seen as the skybox
   */
  createEnvironmentCubemap() {
    this.setupCubemapCaptureFramebuffer(this.ENV_CUBEMAP_WIDTH);
    this.envCubemapTexture = this.createCubemapTexture(this.ENV_CUBEMAP_WIDTH, true);

    this.equirectangularToCubemapShader.use();
    this.equirectangularToCubemapShader.setInt("equirectangular_map", 0);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.hdriTexture);

    this.createCubemap(this.equirectangularToCubemapShader, this.ENV_CUBEMAP_WIDTH, this.envCubemapTexture);
    
    // Generate mipmap levels for the environment cubemap:
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.envCubemapTexture);
    this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
  }

  /**
   * Creates the irradiance map used for diffuse image based lighting.
   */
  createIrradianceMap() {
    this.setupCubemapCaptureFramebuffer(this.IRRADIANCE_CUBEMAP_WIDTH);
    this.irradianceCubemapTexture = this.createCubemapTexture(this.IRRADIANCE_CUBEMAP_WIDTH);

    this.envToIrradianceCubemapShader.use();
    this.envToIrradianceCubemapShader.setInt("environment_map", 0);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.envCubemapTexture);

    this.createCubemap(this.envToIrradianceCubemapShader, this.IRRADIANCE_CUBEMAP_WIDTH, this.irradianceCubemapTexture);
  }

  /**
   * Creates the prefiltered environment cubemap that is used in the specualar part of image based lighting
   */
  createPrefilteredEnvCubemap() {
    this.prefilteredEnvCubemapTexture = this.createCubemapTexture(this.PREFILTERED_CUBEMAP_WIDTH, true);

    this.prefilterEnvCubemapShader.use();
    this.prefilterEnvCubemapShader.setInt("environment_map", 0);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.envCubemapTexture);

    for (var mipLevel = 0; mipLevel < this.PREFILTERED_CUBEMAP_MIPMAP_LEVELS; ++mipLevel) {
      var mipLevelFaceWidth = this.PREFILTERED_CUBEMAP_WIDTH * Math.pow(0.5, mipLevel);

      this.setupCubemapCaptureFramebuffer(mipLevelFaceWidth);

      var roughness = mipLevel / (this.PREFILTERED_CUBEMAP_MIPMAP_LEVELS - 1.0);

      this.prefilterEnvCubemapShader.setFloat("roughness", roughness);
      this.prefilterEnvCubemapShader.setFloat("resolution", mipLevelFaceWidth);
      this.createCubemap(this.prefilterEnvCubemapShader, mipLevelFaceWidth, this.prefilteredEnvCubemapTexture, mipLevel);
    }
  }


  createBrdfLUTTexture() {
    this.brdfLUTTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.brdfLUTTexture);

    this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RG16F, this.BRDF_LUT_TEXTURE_WIDTH, this.BRDF_LUT_TEXTURE_WIDTH);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

    this.setupCubemapCaptureFramebuffer(this.BRDF_LUT_TEXTURE_WIDTH);
    
    const viewportParameters = this.gl.getParameter(this.gl.VIEWPORT);
    const oldWidth = viewportParameters[2];
    const oldHeight = viewportParameters[3];

    this.gl.viewport(0, 0, this.BRDF_LUT_TEXTURE_WIDTH, this.BRDF_LUT_TEXTURE_WIDTH);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.cubemapCaptureFramebuffer);

    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.brdfLUTTexture, 0);

    this.brdfIntegrationMapShader.use();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.screenQuad.draw();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, oldWidth, oldHeight);
  }


  /**
   * Loads a HDR Image
   * @param {string} path 
   * @returns {width: number, height: number, data: Float32Array}
   */
  async loadHDRIData(path) {
    const loader = new HDRLoader();
    loader.setDataType(THREE.FloatType);

    const threeTexture = await loader.loadAsync(path);

    const width = threeTexture.image.width;
    const height = threeTexture.image.height;
    const data = threeTexture.image.data;

    // Free memory
    threeTexture.dispose();
    return {width, height, data};
  }

  /**
   * 
   * @param {width: number, height: number, data: Float32Array} hdrImage 
   */
  setupHDRITexture(hdrImage) {
    this.hdriTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.hdriTexture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, hdrImage.width, hdrImage.height, 0, this.gl.RGBA, this.gl.FLOAT, hdrImage.data);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

  }

  setupCubemapCaptureViewMatrices() {
    const viewMatrices = [mat4.create(), mat4.create(), mat4.create(), mat4.create(), mat4.create(), mat4.create()];
    const origin = vec3.fromValues(0, 0, 0);
    // matrices capturing the cube sides along the x axis
    mat4.lookAt(viewMatrices[0], origin, vec3.fromValues(1.0, 0.0, 0.0), vec3.fromValues(0.0, -1.0, 0.0));
    mat4.lookAt(viewMatrices[1], origin, vec3.fromValues(-1.0, 0.0, 0.0), vec3.fromValues(0.0, -1.0, 0.0));
    // matrices capturing the cube sides along the y axis
    mat4.lookAt(viewMatrices[2], origin, vec3.fromValues(0.0, 1.0, 0.0), vec3.fromValues(0.0, 0.0, 1.0));
    mat4.lookAt(viewMatrices[3], origin, vec3.fromValues(0.0, -1.0, 0.0), vec3.fromValues(0.0, 0.0, -1.0));
    // matrices capturing the cube sides along the z axis
    mat4.lookAt(viewMatrices[4], origin, vec3.fromValues(0.0, 0.0, 1.0), vec3.fromValues(0.0, -1.0, 0.0));
    mat4.lookAt(viewMatrices[5], origin, vec3.fromValues(0.0, 0.0, -1.0), vec3.fromValues(0.0, -1.0, 0.0));

    return viewMatrices;
  }

  /**
   * 
   * @param {number} faceWidth - the width of one quadratic face 
   */
  setupCubemapCaptureFramebuffer(faceWidth) {
    if (this.cubemapCaptureFramebuffer === null) {
      this.cubemapCaptureFramebuffer = this.gl.createFramebuffer();
    }
    if (this.cubemapCaptureRenderbuffer !== null) {
      this.gl.deleteRenderbuffer(this.cubemapCaptureRenderbuffer);
    }
    this.cubemapCaptureRenderbuffer = this.gl.createRenderbuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.cubemapCaptureFramebuffer);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.cubemapCaptureRenderbuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT24, faceWidth, faceWidth);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.cubemapCaptureRenderbuffer);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /**
   * Creates a empty cubemap texture used to render to
   * @param {number} faceWidth - the width of one quadratic face
   * @param {boolean} mipmapped - Indicator if mapmapping should be included into the texture
   * @returns {WebGLTexture} - The created cubemap texture
   */
  createCubemapTexture(faceWidth, mipmapped = false) {
    const cubemapTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, cubemapTexture);

    for (var i = 0; i < 6; ++i) {
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA16F,
        faceWidth, faceWidth, 0, this.gl.RGBA, this.gl.FLOAT, null
      );
    }

    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    if (mipmapped) {
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
      this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
    } else {
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    }

    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
    
    return cubemapTexture;
  }

  /**
   * 
   * @returns {WebGLTexture} 
   */
  getIrradianceCubemapTexture () {
    return this.irradianceCubemapTexture;
  }

  /**
   * 
   * @returns {WebGLTexture} 
   */
  getPrefilteredEnvCubemapTexture() {
    return this.prefilteredEnvCubemapTexture
  }

  /**
   * 
   * @returns {WebGLTexture} 
   */
  getBrdfLutTexture() {
    return this.brdfLUTTexture;
  }

}


export class Skybox {

  /**
   * @param {WebGL2RenderingContext} gl
   * @param {string} path - path to the directory containing the cubemap textures
   */
  constructor(gl) {
    this.gl = gl;
    this.environmentCube = new EnvironmentMapCube(this.gl);

    /** @type {WebGlTexture} */
    this.cubemapTexture = null;
  }

  /**
   * Loads and initializes the skybox by a path to a folder with the faces of the cubemap stored as images;
   * @param {string} path
   */
  async loadByCubemapTexturesPath(path) {
    // Setup textures
    this.cubemapTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTexture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

    const FACE_NAMES = ["posx", "negx", "posy", "negy", "posz", "negz"];

    for (let i = 0; i < FACE_NAMES.length; ++i) {

      // Load the face image
      const faceImage = new Image();
      faceImage.src = path + "/" + FACE_NAMES[i] + ".jpg";
      await faceImage.decode();

      this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, faceImage);

    }

    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
    
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
  }

  /**
   * Loads the skybox by a given created cubemap texture
   * @param {WebGLTexture} cubemapTexture 
   */
  loadByTexture(cubemapTexture) {
    this.cubemapTexture = cubemapTexture;
  }

  /**
   * Draws the skybox
   * @param {Shader} skyboxShader
   */
  draw(skyboxShader) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    skyboxShader.setInt("skybox", 0);
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTexture);

    this.environmentCube.draw();
  }

  /**
   * Deletes the Skybox texture and frees texture memory
   */
  delete() {
    this.gl.deleteTexture(this.cubemapTexture);
    this.cubemapTexture = null;
  }

}

class EnvironmentMapCube {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   */
  constructor(gl) {
    this.FLOAT_SIZE = 4;
    this.VERTEX_FLOAT_COUNT = 3;
    this.STRIDE = this.VERTEX_FLOAT_COUNT * this.FLOAT_SIZE;

    this.gl = gl;
    /**
     * @type {WebGLVertexArrayObject}
     */
    this.vao = null;

    this.vertices = createCubeVertices();
    this.setup();
  }

  setup() {
    this.vao = this.gl.createVertexArray();
    const vbo = this.gl.createBuffer();

    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, this.STRIDE, 0 * this.FLOAT_SIZE);

    this.gl.bindVertexArray(null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  draw() {
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.depthMask(false);
    this.gl.bindVertexArray(this.vao);
    
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);
    
    this.gl.bindVertexArray(null);
    this.gl.depthMask(true);
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.depthFunc(this.gl.LESS);
  }

}


function createCubeVertices() {
  return new Float32Array([
    -1.0,  1.0, -1.0,
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
    -1.0,  1.0, -1.0,

    -1.0, -1.0,  1.0,
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    -1.0, -1.0,  1.0,

     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,

    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0
  ]);
}
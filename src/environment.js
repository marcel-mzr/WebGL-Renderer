import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader";
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export class HDRCubeMap {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   * @param {string} hdriPath - The path the the HDR Image
   */
  constructor(gl, hdriPath) {
    this.ENV_CUBEMAP_WIDTH = 1024; // TODO: maybe change to something lower

    this.gl = gl;
    this.hdriPath = hdriPath;

    this.skybox = new Skybox(this.gl);;
    this.environmentCube = new EnvironmentMapCube(this.gl);

    const extBuffer = this.gl.getExtension("EXT_color_buffer_float");
    if (!extBuffer) console.warn("EXT_color_buffer_float not supported! Cubemap generation might fail.");

    // Required to use LINEAR filtering on float textures
    const extLinear = this.gl.getExtension("OES_texture_float_linear");
    if (!extLinear) console.warn("OES_texture_float_linear not supported! Result might look blocky.");

    /** @type {WebGLTexture} */
    this.envCubemapTexture = null;

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
    this.equirectangularToCubemapShader = new Shader(this.gl, "shaders/equirectangularToCubemap.vert", "shaders/equirectangularToCubemap.frag");
  }

  async init() {
    const hdrImage = await this.loadHDRIData(this.hdriPath);
    this.setupHDRITexture(hdrImage);
    this.setupCubemapCaptureFramebuffer(); // TODO: maybe needs to be called outside of async function
    await this.equirectangularToCubemapShader.init();

    this.createEnvironmentCubemap();
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
   * Captures all 6 sides of a cubemap given a shader and a cube face size as faceWidth
   * @param {Shader} shader - the shader to be used for rendering the faces
   * @param {number} faceWidth - the Width of one quadratic face
   * @param {WebGlTexture} cubemapTexture - The cubemap texture to render to
   */
  createCubemap(shader, faceWidth, cubemapTexture) {
    const viewportParameters = this.gl.getParameter(this.gl.VIEWPORT);
    const oldWidth = viewportParameters[2];
    const oldHeight = viewportParameters[3];
    
    this.gl.viewport(0, 0, faceWidth, faceWidth);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.cubemapCaptureFramebuffer);

    for (var i = 0; i < 6; ++i) {
      shader.setMat4("V", this.cubemapCaptureViewMatrices[i]);
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cubemapTexture, 0
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
    this.equirectangularToCubemapShader.use();
    this.equirectangularToCubemapShader.setInt("equirectangular_map", 0);
    this.equirectangularToCubemapShader.setMat4("P", this.cubemapCaptureProjectionMatrix);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.hdriTexture);

    this.envCubemapTexture = this.createCubemapTexture(this.ENV_CUBEMAP_WIDTH);

    this.createCubemap(this.equirectangularToCubemapShader, this.ENV_CUBEMAP_WIDTH, this.envCubemapTexture);

    // Initialize the Skybox with the rendered cubemap texture
    this.skybox.loadByTexture(this.envCubemapTexture);
  }

  /**
   * Creates the irradiance map used for diffuse image based lighting.
   */
  createIrradianceMap() {

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

  setupCubemapCaptureFramebuffer() {
    this.cubemapCaptureFramebuffer = this.gl.createFramebuffer();
    this.cubemapCaptureRenderbuffer = this.gl.createRenderbuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.cubemapCaptureFramebuffer);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.cubemapCaptureRenderbuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT24, this.ENV_CUBEMAP_WIDTH, this.ENV_CUBEMAP_WIDTH);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.cubemapCaptureRenderbuffer);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /**
   * Creates a empty cubemap texture used to render to
   * @returns {WebGLTexture} - The created cubemap texture
   */
  createCubemapTexture(faceWidth) {
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
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
    
    return cubemapTexture;
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
import { Shader } from "./shader";

export class Skybox {

  /**
   * @param {WebGL2RenderingContext} gl
   * @param {string} path - path to the directory containing the cubemap textures
   */
  constructor(gl, path) {
    this.FLOAT_SIZE = 4;
    this.VERTEX_FLOAT_COUNT = 3;
    this.STRIDE = this.VERTEX_FLOAT_COUNT * this.FLOAT_SIZE;

    this.gl = gl;
    this.path = path;

    /** @type {WebGlTexture} */
    this.cubemap = null;

    /**
     * The positions of the skybox
     * @type {Float32Array}
     */
    this.vertices = createSkyboxVertices();

    /** @type {WebGLVertexArrayObject} */
    this.vao = null;
  }

  /**
   * Loads and initializes the skybox
   */
  async load() {
    // Setup textures
    this.cubemap = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemap);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

    const FACE_NAMES = ["posx", "negx", "posy", "negy", "posz", "negz"];

    for (let i = 0; i < FACE_NAMES.length; ++i) {

      // Load the face image
      const faceImage = new Image();
      faceImage.src = this.path + "/" + FACE_NAMES[i] + ".jpg";
      await faceImage.decode();

      this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, faceImage);

    }

    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
    
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);

    // Setup the Vertex Array Object
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

  /**
   * Draws the skybox
   * @param {Shader} skyboxShader
   */
  draw(skyboxShader) {
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.depthMask(false);

    this.gl.bindVertexArray(this.vao);
    this.gl.activeTexture(this.gl.TEXTURE0);
    skyboxShader.setInt("skybox", 0);
    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemap);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);

    this.gl.depthMask(true);
    // this.gl.enable(this.gl.CULL_FACE)
    this.gl.depthFunc(this.gl.LESS);
  }

}


function createSkyboxVertices() {
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
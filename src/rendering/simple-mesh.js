import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader";

export class SimpleMesh {

  /**
   * 
   * @param {WebGL2RenderingContext} gl
   * @param {Float32Array} vertices - A vertex consists of vec3 postion, vec3 normal, vec2 uvPosition
   * @param {string} diffuseTexturePath
   * @param {string} specularTexturePath
   */
  constructor(gl, vertices, diffuseTexturePath, specularTexturePath) {
    this.FLOAT_SIZE = 4;
    this.STRIDE = 8 * this.FLOAT_SIZE;
    
    this.gl = gl
    this.vertices = vertices;
    this.vertexCount = vertices.length / 8;
    this.diffuseTexturePath = diffuseTexturePath;
    this.specularTexturePath = specularTexturePath;

    this.position = vec3.fromValues(0.0, 0.0, 0.0);
    this.scale = vec3.fromValues(1.0, 1.0, 1.0);
    this.modelMatrix = mat4.create();

    this.updateModelMatrix();
  }

  async load() {
    // Create Textures
    this.diffuseTexture = await this.setupTexture(this.diffuseTexturePath);
    this.specularTexture = await this.setupTexture(this.specularTexturePath);

    this.vao = this.gl.createVertexArray();
    const vbo = this.gl.createBuffer();
    
    // Initialize vertex layout
    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);
    
    // Positions
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, this.STRIDE, 0 * this.FLOAT_SIZE);
    // Normals
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, this.STRIDE, 3 * this.FLOAT_SIZE);
    // UV Coordinates
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, this.STRIDE, 6 * this.FLOAT_SIZE);

    this.gl.bindVertexArray(null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  /**
   * Sets up and configures a texture
   * @param {string} textureSrc - The path of the texture
   * @returns {WebGLTexture} The created and configured texture
   */
  async setupTexture(texturePath) { // TODO: check for images that have width/height which is not a power of 2
    // Load texture image
    const textureImage = new Image();
    textureImage.src = texturePath;
    await textureImage.decode();

    // Set texture options
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

    // fill texture data and generate mipmaps
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureImage);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

    return texture;
  }

  /**
   * 
   * @param {Shader} shader - Active shader (use called beforehand)
   */
  draw(shader) {
    // Input diffuse texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    shader.setInt("material.diffuse", 0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.diffuseTexture);

    // Input specular texture
    this.gl.activeTexture(this.gl.TEXTURE1);
    shader.setInt("material.specular", 1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.specularTexture);

    // Input shininess
    shader.setFloat("material.shininess", 32.0);

    // Set model matrix
    shader.setMat4("M", this.modelMatrix);

    // Draw the mesh
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
    this.gl.bindVertexArray(null);
  }

  /**
   * Sets the position and updates the model matrix
   * @param {vec3} position 
   */
  setPosition(position) {
    this.position = position;
    this.updateModelMatrix();
  }

  /**
   * Sets the scale and updates the model matrix
   * @param {vec3} scale 
   */
  setScale(scale) {
    this.scale = scale;
    this.updateModelMatrix();
  }

  /**
   * Recalculates the model matrix
   */
  updateModelMatrix() {
    mat4.identity(this.modelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
    mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
  }

  /**
   * 
   * @returns {mat4} The model transform of the mesh
   */
  getModelMatrix() {
    return this.modelMatrix;
  }
}

/**
 * Creates a simple uninitialized cube mesh.
 * @param {WebGL2RenderingContext} gl
 * @param {string} diffuseTexturePath
 * @param {string} specularTexturePath
 * @returns {SimpleMesh} the created (uninitialized) cube mesh
 */
export function createSimpleCubeMesh(gl, diffuseTexturePath, specularTexturePath) {
  // Positions, normals, uv's
  const vertices = new Float32Array([
    -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  0.0,
     0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  0.0,
     0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  1.0,
     0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  1.0,
    -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  1.0,
    -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  0.0,

    -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.0,
     0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  0.0,
     0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  1.0,
     0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  1.0,
    -0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  1.0,
    -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.0,

    -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  1.0,  0.0,
    -0.5,  0.5, -0.5, -1.0,  0.0,  0.0,  1.0,  1.0,
    -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  1.0,
    -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  1.0,
    -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,  0.0,  0.0,
    -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  1.0,  0.0,

     0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,
     0.5,  0.5, -0.5,  1.0,  0.0,  0.0,  1.0,  1.0,
     0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0,  1.0,
     0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0,  1.0,
     0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  0.0,  0.0,
     0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,

    -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0,  1.0,
     0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  1.0,  1.0,
     0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0,  0.0,
     0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0,  0.0,
    -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  0.0,  0.0,
    -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0,  1.0,

    -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0,  1.0,
     0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0,  1.0,
     0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
     0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
    -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  0.0,  0.0,
    -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0,  1.0
  ]);

  return new SimpleMesh(gl, vertices, diffuseTexturePath, specularTexturePath);
}
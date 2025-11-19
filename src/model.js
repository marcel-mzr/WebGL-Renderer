import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toMat4 } from "./utils";


export class Model {

  /**
   * 
   * @param {WebGL2RenderingContext} gl
   * @param {string} modelPath 
   */
  constructor(gl, modelPath) {
    this.gl = gl;
    this.modelPath = modelPath;

    /** @type {[Mesh]} */
    this.meshes = [];

    /** @type {Map<String, WebGlTexture>} */
    this.textures = new Map();
  }

  async load() {
    var loader = new GLTFLoader();

    const gltf = await loader.loadAsync(this.modelPath);

    console.log(gltf);
    gltf.scene.traverse((child) => {
      
      if (child.isMesh) {
        /** @type {THREE.Mesh} */
        const threeMesh = child;
        
        const mapTexture = threeMesh.material.map;
        const metalnessMapTexture = threeMesh.material.metalnessMap;
        const normalMapTexture = threeMesh.material.normalMap;
        const roughnessMapTexture = threeMesh.material.roughnessMap;

        // Setup textures of the mesh if they exist
        if (mapTexture?.name && !this.textures.has(mapTexture.name)) {
          this.textures.set(mapTexture.name, this.setupTexture(mapTexture));
        }
        if (metalnessMapTexture?.name && !this.textures.has(metalnessMapTexture.name)) {
          this.textures.set(metalnessMapTexture.name, this.setupTexture(metalnessMapTexture));
        }
        if (normalMapTexture?.name && !this.textures.has(normalMapTexture.name)) {
          this.textures.set(normalMapTexture.name, this.setupTexture(normalMapTexture));
        }
        if (roughnessMapTexture?.name && !this.textures.has(roughnessMapTexture.name)) {
          this.textures.set(roughnessMapTexture.name, this.setupTexture(roughnessMapTexture));
        }
        
        var mesh = new Mesh(this.gl, this, threeMesh);
        mesh.load();
        this.meshes.push(mesh);
      }
    });
  }

  /**
   * Sets up and configures a texture
   * @param {THREE.Texture} threeTexture
   * @returns {WebGLTexture} The created and configured texture
   */
  setupTexture(threeTexture) {
    const textureImage = threeTexture.source.data;

    // Set texture options
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

    // fill texture data and generate mipmaps
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureImage);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return texture;
  }

  /**
   * 
   * @param {Shader} shader 
   */
  draw(shader) {
    if (this.meshes.length === 0) return;
    
    this.meshes.forEach(mesh => {
      mesh.draw(shader);
    }); 
  }


  /**
   * Sets the scale of the model to the scale factor
   * @param {number} scaleFactor
   */
  scale(scaleFactor) {
    this.meshes.forEach(mesh => {
      mesh.scale(scaleFactor);
    });
  }
}


export class Mesh {

  /**
   * 
   * @param {WebGL2RenderingContext} gl
   * @param {Model} model The underlying model
   * @param {THREE.Mesh} threeMesh
   */
  constructor(gl, model, threeMesh) {
    this.FLOAT_SIZE = 4;
    this.VERTEX_FLOAT_COUNT = 12;
    this.STRIDE = this.VERTEX_FLOAT_COUNT * this.FLOAT_SIZE;
    
    this.gl = gl
    this.model = model;

    this.vertices = extractVertices(threeMesh);
    this.indices = extractIndices(threeMesh);

    this.vertexCount = this.vertices.length / this.VERTEX_FLOAT_COUNT;
    
    this.mapTexture = null;
    this.metallnessMapTexture = null;
    this.normalMapTexture = null;
    this.roughnessMapTexture = null;
    this.extractTextures(model, threeMesh);


    // The matrix that transforms the model to the origin of the world space with no scaling or rotation applied
    this.worldMatrix = toMat4(threeMesh.matrixWorld);

    this.modelMatrix = mat4.create();
    this.meshScale = vec3.fromValues(1.0, 1.0, 1.0);

    this.updateModelMatrix();

  }

  load() {
    this.vao = this.gl.createVertexArray();
    const vbo = this.gl.createBuffer();
    const ebo = this.gl.createBuffer();

    // Initialize vertex layout
    this.gl.bindVertexArray(this.vao);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ebo);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);

    // Positions
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, this.STRIDE, 0 * this.FLOAT_SIZE);
    // Normals
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, this.STRIDE, 3 * this.FLOAT_SIZE);
    // Tangents
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 4, this.gl.FLOAT, false, this.STRIDE, 6 * this.FLOAT_SIZE);
    // UV Coordinates
    this.gl.enableVertexAttribArray(3);
    this.gl.vertexAttribPointer(3, 2, this.gl.FLOAT, false, this.STRIDE, 10 * this.FLOAT_SIZE);

    this.gl.bindVertexArray(null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  /**
   * 
   * @param {Shader} shader - Active shader (use called beforehand)
   */
  draw(shader) {
    // Input albedo texture
    if (this.mapTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      shader.setInt("albedo_texture", 0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.mapTexture);
      shader.setBool("has_albedo_texture", true);
    } else {
      shader.setBool("has_albedo_texture", false);
    }
    
    // Set model matrix
    shader.setMat4("M", this.modelMatrix);

    // Draw the mesh
    const indexType = (this.indices instanceof Uint16Array) 
                    ? this.gl.UNSIGNED_SHORT 
                    : this.gl.UNSIGNED_INT;

    this.gl.bindVertexArray(this.vao);
    this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, indexType, 0);
    this.gl.bindVertexArray(null);
  }

  /**
   * Sets the corresponding fields for the textures to the textures if it exists and to null if it doesn't.
   * @param {Model} model 
   * @param {THREE.Mesh} threeMesh 
   */
  extractTextures(model, threeMesh) {
    const mapTexture = threeMesh.material.map;
    const metalnessMapTexture = threeMesh.material.metalnessMap;
    const normalMapTexture = threeMesh.material.normalMap;
    const roughnessMapTexture = threeMesh.material.roughnessMap;

    if (mapTexture?.name) {
      this.mapTexture = model.textures.get(mapTexture.name);
    }
    if (metalnessMapTexture?.name) {
      this.metalnessMapTexture = model.textures.get(metalnessMapTexture.name);
    }
    if (normalMapTexture?.name) {
      this.normalMapTexture = model.textures.get(normalMapTexture.name);
    }
    if (roughnessMapTexture?.name) {
      this.roughnessMapTexture = model.textures.get(roughnessMapTexture.name);
    }
  }

  
  /**
   * Sets the scale of the mesh to the scale factor
   * @param {number} scaleFactor
   */
  scale(scaleFactor) {
    vec3.set(this.meshScale, scaleFactor, scaleFactor, scaleFactor);
    this.updateModelMatrix();
  }

  updateModelMatrix() {
    mat4.scale(this.modelMatrix, mat4.create(), this.meshScale);
    mat4.multiply(this.modelMatrix, this.modelMatrix, this.worldMatrix);
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
 * Extracts the vertices out of a THREE.Mesh
 * @param {THREE.Mesh} threeMesh 
 * @returns {Float32Array} An Array of vertices in order [Vec3 Pos, Vec3 Normal, Vec4 Tangent, Vec2 UV]
 */
function extractVertices(threeMesh) {
  const VERTEX_FLOAT_COUNT = 12;


  if (!(threeMesh.geometry instanceof THREE.BufferGeometry)) {
    throw new Error("Can only process meshes with BufferGeometry type")
  }

  /** @type {THREE.BufferGeometry} */
  const geometry = threeMesh.geometry;

  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const tangents = geometry.getAttribute("tangent");
  const uvs = geometry.getAttribute("uv");

  const vertexCount = positions.count;
  var vertexArray = new Float32Array(VERTEX_FLOAT_COUNT * vertexCount);

  for (let vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
    // Add positions
    for (let i = 0; i < 3; ++i) {
      vertexArray[vertexIndex * VERTEX_FLOAT_COUNT + i] = positions.array[vertexIndex * 3 + i];
    }
    // Add normals
    for (let i = 0; i < 3; ++i) {
      vertexArray[vertexIndex * VERTEX_FLOAT_COUNT + 3 + i] = normals.array[vertexIndex * 3 + i];
    }
    // Add tangents
    if (tangents?.array) {
      for (let i = 0; i < 4; ++i) {
        vertexArray[vertexIndex * VERTEX_FLOAT_COUNT + 6 + i] = tangents.array[vertexIndex * 4 + i];
      }
    }
    // Add uvs
    if (uvs?.array) {
      for (let i = 0; i < 4; ++i) {
        vertexArray[vertexIndex * VERTEX_FLOAT_COUNT + 10 + i] = uvs.array[vertexIndex * 2 + i];
      }
    }
  }
  return vertexArray;
}

/**
 * Extracts the indices out of a THREE.Mesh
 * @param {THREE.Mesh} threeMesh 
 * @returns {Uint32Array} An Array of indices
 */
function extractIndices(threeMesh) {
  return threeMesh.geometry.index.array;
}
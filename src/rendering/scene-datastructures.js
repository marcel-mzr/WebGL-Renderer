import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toMat4, toVec3 } from "./utils";
import { RenderingOptions } from "./renderer";

/**
 * The model holding textures and meshes to be rendered
 */
export class Model {

  /**
   * Contructs a new unitialized model.
   * @param {WebGL2RenderingContext} gl - The webgl context
   * @param {string} modelPath - The path to the .glb or .gltf model file
   * @param {RenderingOptions} renderingOptionsRef - A reference to the renderers rendering options
   */
  constructor(gl, modelPath, renderingOptionsRef) {
    // The default scale that maps to scale factor 1.0 of the largest axis of the model
    this.INITIAL_MODEL_SIZE = 2.0;

    this.gl = gl;
    this.modelPath = modelPath;
    this.renderingOptionsRef = renderingOptionsRef

    /** @type {[Mesh]} */
    this.meshes = [];

    /** @type {Map<String, WebGlTexture>} */
    this.textures = new Map();
  }

  /**
   * Loades the textures and meshes of the model
   */
  async load() {
    var loader = new GLTFLoader();
    
    const gltf = await loader.loadAsync(this.modelPath);

    // Retrieve center position of the object
    const rootObj = gltf.scene;
    const aabb = new THREE.Box3();
    aabb.setFromObject(rootObj);
    const threeCenter = new THREE.Vector3();
    aabb.getCenter(threeCenter);
    const objCenterTranslation = toVec3(threeCenter);
    vec3.scale(objCenterTranslation, objCenterTranslation,-1);

    // Retrieve scale adjustment
    const aabbSize = new THREE.Vector3();
    aabb.getSize(aabbSize);
    const objScaleAdjustment = this.INITIAL_MODEL_SIZE / Math.max(aabbSize.x, aabbSize.y, aabbSize.z);

    console.log(objCenterTranslation);
    console.log(aabb);
    console.log(gltf);
    gltf.scene.traverse((child) => {
      
      if (child.isMesh) {
        /** @type {THREE.Mesh} */
        const threeMesh = child;
        
        // Checks if the name of the textures are present and renames them if needed
        const validateAndRenameTexture = (tex) => {
          if (tex && !tex.name) {
            tex.name = tex.uuid;
          }
          return tex;
        };

        const albedoMapTexture = validateAndRenameTexture(threeMesh.material.map);
        const metalnessMapTexture = validateAndRenameTexture(threeMesh.material.metalnessMap);
        const normalMapTexture = validateAndRenameTexture(threeMesh.material.normalMap);
        const roughnessMapTexture = validateAndRenameTexture(threeMesh.material.roughnessMap);
        const aoMapTexture = validateAndRenameTexture(threeMesh.material.aoMap);

        console.log(albedoMapTexture?.name);
        // Setup textures of the mesh if they exist
        if (albedoMapTexture?.name && !this.textures.has(albedoMapTexture.name)) {
          this.textures.set(albedoMapTexture.name, this.setupTexture(albedoMapTexture));
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
        if (aoMapTexture?.name && !this.textures.has(aoMapTexture.name)) {
          this.textures.set(aoMapTexture.name, this.setupTexture(aoMapTexture));
        }
        
        var mesh = new Mesh(this.gl, this, threeMesh, this.renderingOptionsRef);
        mesh.load();
        mesh.applyWorldMatrixAdjustment(objScaleAdjustment, objCenterTranslation);
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
   * Draws the model with the used shader
   * @param {Shader} shader - The shader that is currently used
   */
  draw(shader) {
    if (this.meshes.length === 0) return;
    
    this.meshes.forEach(mesh => {
      mesh.draw(shader);
    }); 
  }


  /**
   * Sets the scale of the model to the scale factor
   * @param {number} scaleFactor - The new scale factor
   */
  scale(scaleFactor) {
    this.meshes.forEach(mesh => {
      mesh.scale(scaleFactor);
    });
  }
}


/**
 * A triangle mesh of a Model
 */
export class Mesh {

  /**
   * Contructs a Mesh object
   * @param {WebGL2RenderingContext} gl
   * @param {Model} model The underlying model
   * @param {THREE.Mesh} threeMesh
   * @param {RenderingOptions} renderingOptionsRef - a reference to the rendering options of the renderer
   */
  constructor(gl, model, threeMesh, renderingOptionsRef) {
    this.FLOAT_SIZE = 4;
    this.VERTEX_FLOAT_COUNT = 12;
    this.STRIDE = this.VERTEX_FLOAT_COUNT * this.FLOAT_SIZE;
    
    this.gl = gl
    this.model = model;
    this.renderingOptionsRef = renderingOptionsRef;
    
    checkAndComputeGeometry(threeMesh);
    this.vertices = extractVertices(threeMesh);
    this.indices = extractIndices(threeMesh);

    this.vertexCount = this.vertices.length / this.VERTEX_FLOAT_COUNT;
    
    this.albedoMapTexture = null;
    this.metalnessMapTexture = null;
    this.normalMapTexture = null;
    this.roughnessMapTexture = null;
    this.aoMapTexture = null;
    this.extractTextures(model, threeMesh);


    // The matrix that transforms the model to the origin of the world space
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
   * Draws the mesh using the currently used shader supplied to the method
   * @param {Shader} shader - Active shader (use called beforehand)
   */
  draw(shader) {
    this.enableTextures(shader);

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
   * Enables the textures of the mesh for the shader
   * @param {Shader} shader 
   */
  enableTextures(shader) {
    // Enable albedoMap texture
    if (this.albedoMapTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      shader.setInt("albedo_map", 0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.albedoMapTexture);
      shader.setBool("has_albedo_map", true);
    } else {
      shader.setBool("has_albedo_map", false);
    }

    // Enable normalMap texture
    if (this.normalMapTexture && this.renderingOptionsRef.shouldNormalMap) {
      this.gl.activeTexture(this.gl.TEXTURE1);
      shader.setInt("normal_map", 1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalMapTexture);
      shader.setBool("has_normal_map", true);
    } else {
      shader.setBool("has_normal_map", false);
    }

    // Enable metalnessMap texture
    if (this.metalnessMapTexture) {
      this.gl.activeTexture(this.gl.TEXTURE2);
      shader.setInt("metalness_map", 2);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.metalnessMapTexture);
      shader.setBool("has_metalness_map", true);
    } else {
      shader.setBool("has_metalness_map", false);
    }

    // Enable roughnessMap texture
    if (this.roughnessMapTexture) {
      this.gl.activeTexture(this.gl.TEXTURE3);
      shader.setInt("roughness_map", 3);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.roughnessMapTexture);
      shader.setBool("has_roughness_map", true);
    } else {
      shader.setBool("has_roughness_map", false);
    }

    // Enable aoMap texture
    if (this.aoMapTexture && this.renderingOptionsRef.shouldDoAo) {
      // console.log("doing ao");
      this.gl.activeTexture(this.gl.TEXTURE4);
      shader.setInt("ao_map", 4);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.aoMapTexture);
      shader.setBool("has_ao_map", true);
    } else {
      // console.log("not doing ao");

      shader.setBool("has_ao_map", false);
    }
  }

  /**
   * Sets the corresponding fields for the textures to the textures if it exists and to null if it doesn't.
   * @param {Model} model 
   * @param {THREE.Mesh} threeMesh 
   */
  extractTextures(model, threeMesh) {
    const albedoMapTexture = threeMesh.material.map;
    const metalnessMapTexture = threeMesh.material.metalnessMap;
    const normalMapTexture = threeMesh.material.normalMap;
    const roughnessMapTexture = threeMesh.material.roughnessMap;
    const aoMapTexture = threeMesh.material.aoMap;

    if (albedoMapTexture?.name) {
      this.albedoMapTexture = model.textures.get(albedoMapTexture.name);
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
    if (aoMapTexture?.name) {
      this.aoMapTexture = model.textures.get(aoMapTexture.name);
    }
  }

  /**
   * Adjusts the worldMatrix of the Mesh. newWorldMatrix = Scale * Translation * oldWorldMatrix
   * @param {number} scaleFactor - the the scale factor the mesh should be adjusted by
   * @param {vec3} translation - the translation the mesh should be adjusted by
   */
  applyWorldMatrixAdjustment(scaleFactor, translation) {
    var adjustementMatrix = mat4.create();
    mat4.scale(adjustementMatrix, adjustementMatrix, vec3.fromValues(scaleFactor, scaleFactor, scaleFactor));
    mat4.translate(adjustementMatrix, adjustementMatrix, translation);
    mat4.mul(this.worldMatrix, adjustementMatrix, this.worldMatrix);

    this.updateModelMatrix();
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

/**
 * Check if normals and tangens are present in a THREE.Mesh and computes them if not
 * @param {THREE.Mesh} threeMesh 
 */
function checkAndComputeGeometry(threeMesh) {
  const geometry = threeMesh.geometry;

  const normals = threeMesh.geometry.getAttribute("normal");
  const tangents = threeMesh.geometry.getAttribute("tangent");

  if (!geometry.getAttribute("normal")) {
    console.log("Normals of the loaded mesh missing. Computing automatically");
    threeMesh.geometry.computeVertexNormals();
  }

  if (!geometry.getAttribute("tangent")) {
    console.log("Tangents of the loaded mesh are missing.")
    if (!geometry.getAttribute("uv")) {
      console.log("Cannot compute tangents since uv's are missing.");
    } else {
      console.log("Computing tangents");
      threeMesh.geometry.computeTangents();
    }
  }

}
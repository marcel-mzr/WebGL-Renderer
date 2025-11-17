import { mat4 } from 'gl-matrix';
import * as THREE from 'three';


/**
 * Converts a THREE.Matrix4 into a gl-matrix mat4
 * @param {THREE.Matrix4} threeMatrix 
 * @returns {mat4} gl-matrix mat4
 */
export function toMat4(threeMatrix) {
  const m = threeMatrix.toArray();
  return mat4.fromValues(
    m[0],  m[1],  m[2],  m[3],
    m[4],  m[5],  m[6],  m[7],
    m[8],  m[9],  m[10], m[11],
    m[12], m[13], m[14], m[15]
  );
}

/**
 * Extracts the vertices out of a THREE.Mesh
 * @param {THREE.Mesh} threeMesh 
 * @returns {Float32Array} An Array of vertices in order [Vec3 Pos, Vec3 Normal, Vec4 Tangent, Vec2 UV]
 */
export function extractVertices(threeMesh) {
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
export function extractIndices(threeMesh) {
  return threeMesh.geometry.index.array;
}
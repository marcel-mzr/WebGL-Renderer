import { mat4, vec3 } from "gl-matrix";

/**
 * Converts a THREE.Matrix4 into a gl-matrix mat4
 * @param {THREE.Matrix4} threeMatrix4 
 * @returns {mat4} gl-matrix mat4
 */
export function toMat4(threeMatrix4) {
  const m = threeMatrix4.toArray();
  return mat4.fromValues(
    m[0],  m[1],  m[2],  m[3],
    m[4],  m[5],  m[6],  m[7],
    m[8],  m[9],  m[10], m[11],
    m[12], m[13], m[14], m[15]
  );
}

/**
 * Converts a THREE.Matrix4 into a gl-matrix mat4
 * @param {THREE.Matrix4} threeMatrix4 
 * @returns {mat4} gl-matrix mat4
 */
export function toVec3(threeVector3) {
  const v = threeVector3.toArray();
  return vec3.fromValues(v[0], v[1], v[2]);
}
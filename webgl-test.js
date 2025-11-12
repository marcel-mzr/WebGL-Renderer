import { createShaderProgram } from "./shader.js";

main();

async function main() {
  const canvas = document.querySelector("#webgl-canvas");
  /** @type {WebGL2RenderingContext} */
  const gl = canvas.getContext("webgl2");

  // Check for WebGl compatibility
  if (gl === null) {
    alert("WebGL is not supported in your browser");
    return;
  }

  const shaderProgram = await createShaderProgram(gl, "shaders/basic.vert", "shaders/basic.frag");
  const aPosLocation = gl.getAttribLocation(shaderProgram, "a_position");
  
  const vertices = new Float32Array([
     0.0,  1.0,
    1, -1,
     -1, -1
  ]);

  // Create Vertex buffer object
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const FLOAT_SIZE = 4;
  const stride = 2 * FLOAT_SIZE;
  const positionalOffset = 0;

  function render() {
    gl.clearColor(0.7, 0.7, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Enable and set position
    gl.enableVertexAttribArray(aPosLocation);
    gl.vertexAttribPointer(aPosLocation, 2, gl.FLOAT, false, stride, positionalOffset);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render();

}
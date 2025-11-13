import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader.js";


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

  /** @type {Shader} */
  const basicShader = new Shader(gl, "shaders/basic.vert", "shaders/basic.frag");
  await basicShader.init();


  //const shaderProgram = await createShaderProgram(gl, "shaders/basic.vert", "shaders/basic.frag");
  const aPosLocation = gl.getAttribLocation(basicShader.program, "a_position");
  const aColorLocation = gl.getAttribLocation(basicShader.program, "a_color");


  const vertices = new Float32Array([
     0.0,  1.0, 1.0, 0.0, 0.0,
     1.0, -1.0, 0.0, 1.0, 0.0, 
    -1.0, -1.0, 0.0, 0.0, 1.0
  ]);

  // Create Camera 
  const cameraPosition = vec3.fromValues(0.0, 0.0, 5.0);
  const cameraTarget = vec3.fromValues(0.0, 0.0, 0.0);

  var cameraDirection = vec3.create();
  vec3.subtract(cameraDirection, cameraPosition, cameraTarget);
  vec3.normalize(cameraDirection, cameraDirection);

  const worldUp = vec3.fromValues(0.0, 1.0, 0.0);

  var cameraRight = vec3.create();
  vec3.cross(cameraRight, worldUp, cameraDirection);
  vec3.normalize(cameraRight, cameraRight);

  var cameraUp = vec3.create();
  vec3.cross(cameraUp, cameraDirection, cameraRight);
  vec3.normalize(cameraUp, cameraUp);

  var view = mat4.create();
  mat4.lookAt(view, cameraPosition, cameraTarget, worldUp);


  const fov = 45 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projection = mat4.create();
  mat4.perspective(projection, fov, aspect, 0.1, 100);

  var MVP = mat4.create();
  mat4.multiply(MVP, projection, view);


  // Create Vertex buffer object
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const FLOAT_SIZE = 4;
  const stride = 5 * FLOAT_SIZE;
  const positionalOffset = 0 * FLOAT_SIZE;
  const colorOffset = 2 * FLOAT_SIZE;

  function render() {
    gl.clearColor(0.7, 0.7, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT)

    basicShader.use();
    basicShader.setMat4("MVP", MVP);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Enable and set position
    gl.enableVertexAttribArray(aPosLocation);
    gl.vertexAttribPointer(aPosLocation, 2, gl.FLOAT, false, stride, positionalOffset);

    gl.enableVertexAttribArray(aColorLocation);
    gl.vertexAttribPointer(aColorLocation, 3, gl.FLOAT, false, stride, colorOffset);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render();

}
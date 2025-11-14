import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shader.js";
import {InputHandler} from "./input.js";
import { Camera } from "./camera.js";


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
    -0.5, -0.5, -0.5,  0.0, 0.0, 0.0,
      0.5, -0.5, -0.5,  1.0, 0.0, 0.0,
      0.5,  0.5, -0.5,  1.0, 1.0, 0.0,
      0.5,  0.5, -0.5,  1.0, 1.0, 0.0,
    -0.5,  0.5, -0.5,  0.0, 1.0, 0.0,
    -0.5, -0.5, -0.5,  0.0, 0.0, 0.0,

    -0.5, -0.5,  0.5,  0.0, 0.0, 0.0,
      0.5, -0.5,  0.5,  1.0, 0.0, 0.0,
      0.5,  0.5,  0.5,  1.0, 1.0, 0.0,
      0.5,  0.5,  0.5,  1.0, 1.0, 0.0,
    -0.5,  0.5,  0.5,  0.0, 1.0, 0.0,
    -0.5, -0.5,  0.5,  0.0, 0.0, 0.0,

    -0.5,  0.5,  0.5,  1.0, 0.0, 0.0,
    -0.5,  0.5, -0.5,  1.0, 1.0, 0.0,
    -0.5, -0.5, -0.5,  0.0, 1.0, 0.0,
    -0.5, -0.5, -0.5,  0.0, 1.0, 0.0,
    -0.5, -0.5,  0.5,  0.0, 0.0, 0.0,
    -0.5,  0.5,  0.5,  1.0, 0.0, 0.0,

      0.5,  0.5,  0.5,  1.0, 0.0, 0.0,
      0.5,  0.5, -0.5,  1.0, 1.0, 0.0,
      0.5, -0.5, -0.5,  0.0, 1.0, 0.0,
      0.5, -0.5, -0.5,  0.0, 1.0, 0.0,
      0.5, -0.5,  0.5,  0.0, 0.0, 0.0,
      0.5,  0.5,  0.5,  1.0, 0.0, 0.0,

    -0.5, -0.5, -0.5,  0.0, 1.0, 0.0,
      0.5, -0.5, -0.5,  1.0, 1.0, 0.0,
      0.5, -0.5,  0.5,  1.0, 0.0, 0.0,
      0.5, -0.5,  0.5,  1.0, 0.0, 0.0,
    -0.5, -0.5,  0.5,  0.0, 0.0, 0.0,
    -0.5, -0.5, -0.5,  0.0, 1.0, 0.0,

    -0.5,  0.5, -0.5,  0.0, 1.0, 0.0,
      0.5,  0.5, -0.5,  1.0, 1.0, 0.0,
      0.5,  0.5,  0.5,  1.0, 0.0, 0.0,
      0.5,  0.5,  0.5,  1.0, 0.0, 0.0,
      
    -0.5,  0.5,  0.5,  0.0, 0.0, 0.0,
    -0.5,  0.5, -0.5,  0.0, 1.0, 0.0,
  ]);

  // Input system
  const inputHandler = new InputHandler(canvas);
  /*
  inputHandler.subscribe("pointermove", (event) => {
    console.log("pointermove");
  });

  inputHandler.subscribe("pointerup", (event) => {
    console.log("pointerup");
  });

  inputHandler.subscribe("pointerdown", (event) => {
    console.log("pointerdown");
  });

  inputHandler.subscribe("pointercancel", (event) => {
    console.log("pointercancel");
  });
  */
  // Create Camera 
  const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const camera = new Camera(inputHandler, aspectRatio);

  var MVP = camera.getViewProjectionMatrix();
  
  // Create Vertex buffer object
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const FLOAT_SIZE = 4;
  const stride = 6 * FLOAT_SIZE;
  const positionalOffset = 0 * FLOAT_SIZE;
  const colorOffset = 3 * FLOAT_SIZE;
  gl.enable(gl.DEPTH_TEST);

  function render(time) {
    gl.clearColor(0.7, 0.7, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    basicShader.use();
    basicShader.setMat4("MVP", MVP);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Enable and set position
    gl.enableVertexAttribArray(aPosLocation);
    gl.vertexAttribPointer(aPosLocation, 3, gl.FLOAT, false, stride, positionalOffset);

    gl.enableVertexAttribArray(aColorLocation);
    gl.vertexAttribPointer(aColorLocation, 3, gl.FLOAT, false, stride, colorOffset);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    requestAnimationFrame(render);
    camera.calculateCameraParameters(time * 0.001, time * 0.0005, camera.distance);
  }

  requestAnimationFrame(render);

}
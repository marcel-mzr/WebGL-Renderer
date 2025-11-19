import { Shader } from "./shader.js";
import {InputHandler} from "./input.js";
import { Camera } from "./camera.js";
import { SimpleMesh } from "./simple-mesh.js";
import {vec3} from "gl-matrix";
import { Model } from "./model.js";
import { RendererController } from "./renderer-controller.js";
import { Skybox } from "./skybox.js";


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

  /** @type {Shader} */
  const lightShader = new Shader(gl, "shaders/light.vert", "shaders/light.frag");
  await lightShader.init();

  /** @type {Shader} */
  const testShader = new Shader(gl, "shaders/test.vert", "shaders/test.frag");
  await testShader.init();

  /** @type {Shader} */
  const skyboxShader = new Shader(gl, "shaders/skybox.vert", "shaders/skybox.frag");
  await skyboxShader.init();



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


  // const model = new Model(gl, "assets/whimsical_enchanted_forest_cottage/scene.gltf");
  // const model = new Model(gl, "assets/survival_guitar_backpack/scene.gltf");
  const model = new Model(gl, "assets/porsche_911_gt3_r_no_interior/scene.gltf");
  await model.load();

  const skybox = new Skybox(gl, "assets/storforsen2_skybox");
  await skybox.load();

  const rendererController = new RendererController(model);

  const cubeMesh = new SimpleMesh(gl, vertices, "assets/container_diffuse.png", "assets/container_specular.png");
  // const cubeMesh = new SimpleMesh(gl, vertices, "assets/white.png", "assets/white.png");
  await cubeMesh.load();

  const lightMesh = new SimpleMesh(gl, vertices, "assets/white.png", "assets/white.png");
  await lightMesh.load();
  const lightPosition = vec3.fromValues(2.0, 2.0, 1.0);
  lightMesh.setPosition(lightPosition);
  lightMesh.setScale(vec3.fromValues(0.2, 0.2, 0.2));
  /*
  const lightAmbient = vec3.fromValues(0.2, 0.2, 0.2);
  const lightDiffuse = vec3.fromValues(0.5, 0.5, 0.5);
  const lightSpecular = vec3.fromValues(1.0, 1.0, 1.0);
  */

  const inputHandler = new InputHandler(canvas);
  
  const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const camera = new Camera(inputHandler, aspectRatio);

  gl.enable(gl.DEPTH_TEST);

  function render() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    var VP = camera.getViewProjectionMatrix();
    /*
    basicShader.use();
    basicShader.setMat4("VP", VP);

    basicShader.setVec3("light.position", lightPosition);
    basicShader.setVec3("light.ambient", lightAmbient);
    basicShader.setVec3("light.diffuse", lightDiffuse);
    basicShader.setVec3("light.specular", lightSpecular);
    
    basicShader.setVec3("camera_position", camera.getPosition())
    cubeMesh.draw(basicShader);
     */

    //testShader.setMat4("VP", VP);
    testShader.use();
    testShader.setMat4("VP", VP);
    model.draw(testShader);
    
    lightShader.use();
    lightShader.setMat4("VP", VP);
    lightMesh.draw(lightShader);

    skyboxShader.use(); 
    skyboxShader.setMat4("VP", VP);
    skybox.draw(skyboxShader);
    
    console.log("test");
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

}
import { Camera } from "./rendering/camera.js";
import { InputHandler } from "./rendering/input.js";
import { Renderer } from "./rendering/renderer.js";
import { RendererController } from "./rendering/renderer-controller.js";

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

  const inputHandler = new InputHandler(canvas);
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;

  const camera = new Camera(inputHandler, aspectRatio);

  const renderer = new Renderer(gl, camera);
  await renderer.init();

  const renderController = new RendererController(renderer);
  renderController.init();

  renderer.render();
}
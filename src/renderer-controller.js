import { Renderer } from "./renderer";
import { Model } from "./scene-datastructures";

export class RendererController {

  /**
   * @param {Renderer} renderer 
   */
  constructor(renderer) {
    this.renderer = renderer;
  }

  setupCallbacks() {
    document.getElementById("model-scale-slider").addEventListener("input", (e) => this.onModelScale(e));
  }

  onModelScale(event) {
    this.renderer.getModel().scale(event.target.value);
  }

}
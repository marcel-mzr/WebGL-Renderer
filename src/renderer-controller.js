import { Model } from "./model";

export class RendererController {

  /**
   * @param {Model} model 
   */
  constructor(model) {
    this.model = model;

    // Setup callbacks
    document.getElementById("model-scale-slider").addEventListener("input", (e) => this.onModelScale(e));

  }

  onModelScale(event) {
    this.model.scale(event.target.value);
  }

}
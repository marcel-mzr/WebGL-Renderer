import { Renderer } from "./renderer";
import { Model } from "./scene-datastructures";

export class RendererController {

  /**
   * @param {Renderer} renderer 
   */
  constructor(renderer) {
    this.renderer = renderer;

    // Canvas
    this.webglCanvas = document.getElementById("webgl-canvas");
    this.webglCanvasWrapper = document.getElementById("canvas-wrapper");
    this.loadingSpinner = document.getElementById("loading-spinner");

    // Model Controls
    this.modelSelector = document.getElementById("model-select");
    this.scaleSlider = document.getElementById("model-scale");
    this.scaleDisplay = document.getElementById("scale-display");

    // Environment Controls
    this.sunToggle = document.getElementById("toggle-sun");
    this.sunIntensitySlider = document.getElementById("sun-intensity");
    this.sunToViewButton = document.getElementById("btn-sun-cam");
    this.envMapToggle = document.getElementById("toggle-env");

    // Renderer:
    this.aoMapToggle = document.getElementById("toggle-ao");
    this.normalMapToggle = document.getElementById("toggle-normal");
    this.iblToggle = document.getElementById("toggle-ibl");
    this.shadowsToggle = document.getElementById("toggle-shadows");

  }

  /**
   * Initializes the RendererController and sets up the callbacks
   */
  init() {
    // Call necessary functions on init
    this.onCanvasResize();
    this.onModelScale();
    this.onSunIntensityChange();

    this.setupCallbacks();
  }

  setupCallbacks() {
    // Canvas
    window.addEventListener("resize", () => this.onCanvasResize());

    // Model Controls
    this.modelSelector.addEventListener("change", async () => this.onModelSelect());
    this.scaleSlider.addEventListener("input", () => this.onModelScale());

    // Environment Controls
    this.sunToggle.addEventListener("click", () => this.onSunToggle());
    this.sunIntensitySlider.addEventListener("input", () => this.onSunIntensityChange());
    this.sunToViewButton.addEventListener("click", () => this.onSunDirectionChangeClick());
    this.envMapToggle.addEventListener("click", () => this.onEnvMapToggle());

    // Renderer Controls
    this.aoMapToggle.addEventListener("click", () => this.onAoMapToggle());
    this.normalMapToggle.addEventListener("click", () => this.onNormalMapToggle());
    this.iblToggle.addEventListener("click", () => this.onIblToggle());
    this.shadowsToggle.addEventListener("click", () => this.onShadowsToggle());
  }

  /**
   * Enables/Disables the loading spinner
   * @param {boolean} shouldSpin - The bool that signals whether to enable (true) or disable (false)
   */
  setLoadingSpinnerSpinning(shouldSpin) {
    if (shouldSpin) {
      this.loadingSpinner.classList.remove("hidden");
    } else {
      this.loadingSpinner.classList.add("hidden");
    }
  }

  /**
   * Callback that gets called when the canvas resizes
   */
  onCanvasResize() {
    const displayWidth = this.webglCanvasWrapper.clientWidth;
    const displayHeight = this.webglCanvasWrapper.clientHeight;

    const currentCanvasWidth = this.webglCanvas.width;
    const currentCanvasHeight = this.webglCanvas.height;

    // Check if the canvas resized
    if (currentCanvasWidth !== displayWidth || currentCanvasHeight !== displayHeight) {
      this.webglCanvas.width = displayWidth;
      this.webglCanvas.height = displayHeight;
      
      this.renderer.setViewPortDimensions(displayWidth, displayHeight);
    }
  }

  async onModelSelect() {
    const modelPath = this.modelSelector.value;
    this.setLoadingSpinnerSpinning(true);
    await this.renderer.loadModelByPath(modelPath);
    this.setLoadingSpinnerSpinning(false);
  }

  onModelScale() {
    const scaleValue = Number(this.scaleSlider.value);
    this.renderer.getModel().scale(scaleValue);
    this.scaleDisplay.innerText = scaleValue;
  }

  onSunToggle() { // TODO: implement
    if (this.sunToggle.checked) {
      console.log("Sun toggle checked"); 
    } else {
      console.log("Sun toggle unchecked"); 
    }
  }

  onSunIntensityChange() {
    const intensity = Number(this.sunIntensitySlider.value);
    this.renderer.setSunIntensity(intensity);
  }

  onSunDirectionChangeClick() {
    this.renderer.setSunDirectionToCameraViewDirection();
  }

  onEnvMapToggle() { // TODO: implement
    if (this.envMapToggle.checked) {
      console.log("Env map toggle checked");
      // Enable iblToggle
      this.iblToggle.disabled = false;
      this.iblToggle.classList.remove("disabled-row");
    } else {
      // Restrict Ibl option
      this.iblToggle.checked = false;
      this.onIblToggle();
      this.iblToggle.disabled = true;
      this.iblToggle.classList.add("disabled-row");

      console.log("Env map toggle unchecked"); 
    }
  }

  onAoMapToggle() { // TODO: implement
    if (this.aoMapToggle.checked) {
      console.log("Ao Map toggle checked"); 
    } else {
      console.log("Ao Map toggle unchecked"); 
    }
  }

  onNormalMapToggle() { // TODO: implement
    if (this.normalMapToggle.checked) {
      console.log("Normal Map toggle checked"); 
    } else {
      console.log("Normal Map toggle unchecked"); 
    }
  }

  onIblToggle() { // TODO: implement
    if (this.iblToggle.checked) {
      console.log("Ibl toggle checked"); 
    } else {
      console.log("Ibl toggle unchecked"); 
    }
  }

  onShadowsToggle() { // TODO: implement
    if (this.shadowsToggle.checked) {
      console.log("Shadows toggle checked"); 
    } else {
      console.log("Shadows toggle unchecked"); 
    }
  }

}
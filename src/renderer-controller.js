import { Renderer } from "./renderer";
import { Model } from "./scene-datastructures";
import { hexToRGBVec } from "./utils";

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
    this.envSelector = document.getElementById("env-select");
    this.sunToggle = document.getElementById("toggle-sun");
    this.sunIntensitySlider = document.getElementById("sun-intensity");
    this.sunToViewButton = document.getElementById("btn-sun-cam");
    this.envMapToggle = document.getElementById("toggle-env");
    this.envColorPicker = document.getElementById("env-color-picker");

    // Renderer:
    this.aoMapToggle = document.getElementById("toggle-ao");
    this.normalMapToggle = document.getElementById("toggle-normal");
    this.iblToggle = document.getElementById("toggle-ibl");
    this.shadowsToggle = document.getElementById("toggle-shadows");
    this.toneMappingToggle = document.getElementById("toggle-tone-mapping");
    this.gammaCorrectionToggle = document.getElementById("toggle-gamma-correction");

  }

  /**
   * Initializes the RendererController and sets up the callbacks
   */
  init() {
    // Hide initial loadup spinner
    this.setLoadingSpinnerSpinning(false);

    // Call necessary functions on init
    this.onCanvasResize();
    this.onModelScale();
    this.onSunIntensityChange();
    this.onEnvColorPickerChange();

    this.setupCallbacks();
  }

  setupCallbacks() {
    // Canvas
    window.addEventListener("resize", () => this.onCanvasResize());

    // Model Controls
    this.modelSelector.addEventListener("change", async () => this.onModelSelect());
    this.scaleSlider.addEventListener("input", () => this.onModelScale());

    // Environment Controls
    this.envSelector.addEventListener("change", async () => this.onEnvSelect());
    this.sunToggle.addEventListener("click", () => this.onSunToggle());
    this.sunIntensitySlider.addEventListener("input", () => this.onSunIntensityChange());
    this.sunToViewButton.addEventListener("click", () => this.onSunDirectionChangeClick());
    this.envMapToggle.addEventListener("click", () => this.onEnvMapToggle());
    this.envColorPicker.addEventListener("input", () => this.onEnvColorPickerChange());

    // Renderer Controls
    this.aoMapToggle.addEventListener("click", () => this.onAoMapToggle());
    this.normalMapToggle.addEventListener("click", () => this.onNormalMapToggle());
    this.iblToggle.addEventListener("click", () => this.onIblToggle());
    this.shadowsToggle.addEventListener("click", () => this.onShadowsToggle());
    this.toneMappingToggle.addEventListener("click", () => this.onToneMappingToggle());
    this.gammaCorrectionToggle.addEventListener("click", () => this.onGammaCorrectionToggle());

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

    this.onModelScale();
  }

  onModelScale() {
    const scaleValue = Number(this.scaleSlider.value);
    this.renderer.getModel().scale(scaleValue);
    this.renderer.updateLightSpaceMatrix(scaleValue);
    this.scaleDisplay.innerText = scaleValue;
  }

  async onEnvSelect() {
    const envPath = this.envSelector.value;
    console.log(envPath);
    this.setLoadingSpinnerSpinning(true);
    await this.renderer.loadEnvByPath(envPath);
    this.setLoadingSpinnerSpinning(false);
  }

  onSunToggle() {
    if (this.sunToggle.checked) {
      this.renderer.renderingOptions.shouldRenderSun = true;
      this.shadowsToggle.disabled = false;
      this.shadowsToggle.classList.remove("disabled-row");
      this.onShadowsToggle();
    } else {
      this.renderer.renderingOptions.shouldRenderSun = false;
      this.shadowsToggle.checked = false;
      this.shadowsToggle.disabled = true;
      this.shadowsToggle.classList.add("disabled-row");
      this.onShadowsToggle();
    }
  }

  onSunIntensityChange() {
    const intensity = Number(this.sunIntensitySlider.value);
    this.renderer.setSunIntensity(intensity);
  }

  onSunDirectionChangeClick() {
    this.renderer.setSunDirectionToCameraViewDirection();
    const modelScale = Number(this.scaleSlider.value);
    this.renderer.updateLightSpaceMatrix(modelScale);
  }

  onEnvMapToggle() {
    if (this.envMapToggle.checked) {
      this.renderer.renderingOptions.shouldRenderEnvironmentMap = true;
      // Enable iblToggle
      this.iblToggle.disabled = false;
      this.iblToggle.classList.remove("disabled-row");
    } else {
      this.renderer.renderingOptions.shouldRenderEnvironmentMap = false;
      // Restrict Ibl option
      this.iblToggle.checked = false;
      this.onIblToggle();
      this.iblToggle.disabled = true;
      this.iblToggle.classList.add("disabled-row");
    }
  }

  // TODO: Implement
  onEnvColorPickerChange() {
    const hexColor = this.envColorPicker.value;
    const color = hexToRGBVec(hexColor);
    this.renderer.setEnvColor(color);
  }

  onAoMapToggle() {
    if (this.aoMapToggle.checked) {
      this.renderer.renderingOptions.shouldDoAo = true;
    } else {
      this.renderer.renderingOptions.shouldDoAo = false;
    }
  }

  onNormalMapToggle() {
    if (this.normalMapToggle.checked) {
      this.renderer.renderingOptions.shouldNormalMap = true;
    } else {
      this.renderer.renderingOptions.shouldNormalMap = false;
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
      this.renderer.renderingOptions.shouldRenderShadows = true;
    } else {
      this.renderer.renderingOptions.shouldRenderShadows = false;
    }
  }

  onToneMappingToggle() {
    if (this.toneMappingToggle.checked) {
      this.renderer.renderingOptions.shouldTonemap = true; 
    } else {
      this.renderer.renderingOptions.shouldTonemap = false;
    }
  }

  onGammaCorrectionToggle() {
    if (this.gammaCorrectionToggle.checked) {
      this.renderer.renderingOptions.shouldGammaCorrect = true;
    } else {
      this.renderer.renderingOptions.shouldGammaCorrect = false;
    }
  }

}
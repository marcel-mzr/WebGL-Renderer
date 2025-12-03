
/**
 * A input handler class that notifies its subscribers about input events on the canvas
 */
export class InputHandler {

  /**
   * Initializes the InputHandler and registers all supported event listeners
   * @param {HTMLCanvasElement} canvas - The canvas the input handler is attached to
   */
  constructor(canvas) {
    this.canvas = canvas;

    this.pointerupCallbacks = [];
    this.pointerdownCallbacks = [];
    this.pointermoveCallbacks = [];
    this.pointercancelCallbacks = [];
    this.wheelCallbacks = [];

    this.registerEventListeners();
  }

  /**
   * Subscribes to the event listener with the type eventType. 
   * Calls the callback if that event occurs.
   * @param {string} eventType - pointerup | pointerdown | pointermove | pointercancel
   * @param {*} callback
   * @throws {Error} Throws an error if the eventType is not supported or cannot be found
   */
  subscribe(eventType, callback) {
    if (eventType === "pointerup") {
      this.pointerupCallbacks.push(callback);
    }
    else if (eventType === "pointerdown") {
      this.pointerdownCallbacks.push(callback);
    }
    else if (eventType === "pointermove") {
      this.pointermoveCallbacks.push(callback);
    }
    else if (eventType === "pointercancel") {
      this.pointercancelCallbacks.push(callback);
    }
    else if (eventType == "wheel") {
      this.wheelCallbacks.push(callback);
    }
    else {
      throw Error(`Tried to subscribe to unsupported event type ${eventType}`);
    }
  }

  /**
   * Registers the supported event listeners
   */
  registerEventListeners() {
    this.canvas.addEventListener("pointerup", (event) => {
      for (let callback of this.pointerupCallbacks) {
        callback(event);
      }
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      for (let callback of this.pointerdownCallbacks) {
        callback(event);
      }
    });

    this.canvas.addEventListener("pointermove", (event) => {
      for (let callback of this.pointermoveCallbacks) {
        callback(event);
      }
    });

    this.canvas.addEventListener("pointercancel", (event) => {
      for (let callback of this.pointercancelCallbacks) {
        callback(event);
      }
    });

    this.canvas.addEventListener("wheel", (event) => {
      for (let callback of this.wheelCallbacks) {
        callback(event);
      }
    });
  }

}
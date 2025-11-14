export class InputHandler {

  /**
   * Initializes the InputHandler and registers all supported event listeners
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;

    this.pointerupSubscribers = [];
    this.pointerdownSubscribers = [];
    this.pointermoveSubscribers = [];
    this.pointercancelSubscribers = [];

    this.registerEventListeners();
  }

  /**
   * Subscribes to the event listener with the type eventType. 
   * Calls the notifyFunction if that event occurs.
   * @param {string} eventType - pointerup | 
   * @param {*} notifyFunction 
   * @throws {Error} Throws an error if the eventType is not supported or cannot be found
   */
  subscribe(eventType, notifyFunction) {
    if (eventType === "pointerup") {
      this.pointerupSubscribers.push(notifyFunction);
    }
    else if (eventType === "pointerdown") {
      this.pointerdownSubscribers.push(notifyFunction);
    }
    else if (eventType === "pointermove") {
      this.pointermoveSubscribers.push(notifyFunction);
    }
    else if (eventType === "pointercancel") {
      this.pointercancelSubscribers.push(notifyFunction);
    }
    else {
      throw Error(`Tried to subscribe to unsupported event type ${eventType}`);
    }
  }

  registerEventListeners() {
    this.canvas.addEventListener("pointerup", (event => {
      for (let notifyFunction of this.pointerupSubscribers) {
        notifyFunction(event);
      }
    }));

    this.canvas.addEventListener("pointerdown", (event => {
      for (let notifyFunction of this.pointerdownSubscribers) {
        notifyFunction(event);
      }
    }));

    this.canvas.addEventListener("pointermove", (event => {
      for (let notifyFunction of this.pointermoveSubscribers) {
        notifyFunction(event);
      }
    }));

    this.canvas.addEventListener("pointercancel", (event => {
      for (let notifyFunction of this.pointercancelSubscribers) {
        notifyFunction(event);
      }
    }));
  }

}
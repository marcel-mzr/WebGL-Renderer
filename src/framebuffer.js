export class Framebuffer {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   */
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;


    /**
     * @type {WebGLTexture}
     */
    this.colorBufferTexture = null;
    /**
     * @type {WebGLRenderbuffer}
     */
    this.rbo = null;

    /**
     * @type {WebGLFramebuffer}
     */
    this.framebuffer = this.gl.createFramebuffer();
    
    this.setup();
  }

  setup() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    // Setup color buffer
    this.colorBufferTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorBufferTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.width, this.height, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, null);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.colorBufferTexture, 0);

    // Setup render buffer for depth and stencil test
    this.rbo = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.rbo);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH24_STENCIL8, this.width, this.height);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this.rbo);

    // Check if creation failed
    if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) != this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Error creating Framebuffer");
    }
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /**
   * 
   * @param {number} width 
   * @param {number} height 
   */
  resize(width, height) {
    this.gl.deleteTexture(this.colorBufferTexture);
    this.gl.deleteRenderbuffer(this.rbo);
    this.width = width;
    this.height = height;
    this.setup();
  }

  enable() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  disable() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.disable(this.gl.DEPTH_TEST);
  }

  getColorBufferTexture() {
    return this.colorBufferTexture;
  }

}
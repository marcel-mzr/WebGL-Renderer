
/**
 * A quad filling the screen in Nomalized Device Coordinates
 */
export class NDCQuad {

  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   */
  constructor(gl) {
    this.FLOAT_SIZE = 4;

    this.gl = gl
    
    // positions, uvs
    this.vertices = new Float32Array([
     -1.0,  1.0,  0.0, 1.0,
     -1.0, -1.0,  0.0, 0.0,
      1.0, -1.0,  1.0, 0.0,

     -1.0,  1.0,  0.0, 1.0,
      1.0, -1.0,  1.0, 0.0,
      1.0,  1.0,  1.0, 1.0
    ]);

    /**
     * @type {WebGLVertexArrayObject}
     */
    this.vao = this.gl.createVertexArray();
    var vbo = this.gl.createBuffer();

    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);
    
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 4 * this.FLOAT_SIZE, 0);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 4 * this.FLOAT_SIZE, 2 * this.FLOAT_SIZE);

    this.gl.bindVertexArray(null);
  }

  draw() {
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.bindVertexArray(null);
  }

}
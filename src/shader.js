export class Shader {

  /**
   * Construct an uninitilized shader for a WebGL context
   * @param {WebGL2RenderingContext} gl - The rendering context
   * @param {string} vertexShaderPath - The path to the vertex shader
   * @param {string} fragmentShaderPath - The path to the fragment shader
   */
  constructor(gl, vertexShaderPath, fragmentShaderPath) {
    this.gl = gl;
    this.vertexShaderPath = vertexShaderPath;
    this.fragmentShaderPath = fragmentShaderPath;

    /** @type {WebGLProgram} */
    this.program = null;
  }

  /**
   * Initializes, loads and compiles the specified shader
   */
  async init() {
    const vertexShaderSource = await fetch(this.vertexShaderPath).then(r => r.text());
    const fragmentShaderSource = await fetch(this.fragmentShaderPath).then(r => r.text());;

    const vertexShader = createWebGlShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createWebGlShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    var program = this.gl.createProgram();

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);

    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const infoLog = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);

      throw new Error(
        `An error occured linking Vertex Shader: ${this.vertexShaderPath} 
        and Fragment Shader: ${this.fragmentShaderPath}. Error Log:\n${infoLog}`
      );
    }
    
    this.program = program;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  /**
   * Method for retrieving the attribute location of the specified attribute
   * @param {string} attributeName - Name of the attribute
   * @returns {GLint} Returns the position of the attribute in the shader
   */
  getAttribLocation(attributeName) {
    return this.gl.getAttribLocation(this.program, attributeName);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {GLint} value - The value to be set
   */
  setInt(uniformName, value) {
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {GLfloat} value - The value to be set
   */
  setFloat(uniformName, value) {
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {GLboolean} value - The value to be set
   */
  setBool(uniformName, value) {
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setVec2(uniformName, value) {
    this.gl.uniform2fv(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setVec3(uniformName, value) {
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setVec4(uniformName, value) {
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, uniformName), value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setMat2(uniformName, value) {
    this.gl.uniformMatrix2fv(this.gl.getUniformLocation(this.program, uniformName), false, value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setMat3(uniformName, value) {
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.program, uniformName), false, value);
  }

  /**
   * Set the uniform with the name uniformName to the specified value
   * @param {string} uniformName - The name of the uniform
   * @param {Float32Array} value - The value to be set
   */
  setMat4(uniformName, value) {
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, uniformName), false, value);
  }
}

/**
 * Creates a WebGl shader of shaderType given the shaderSource
 * @param {WebGL2RenderingContext} gl 
 * @param {*} shaderType - The shader type: Either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} shaderSource - The source code of the shader to be compiled
 * @returns {WebGLShader} The compiled shader
 * @throws {Error} Error if compilation failed
 */
function createWebGlShader(gl, shaderType, shaderSource) {
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  // Check if shader compilation failed
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var shaderTypeName = "Unknown Shader";
    if (shaderType == gl.VERTEX_SHADER) {
      shaderTypeName = "Vertex Shader";
    } else if (shaderType == gl.FRAGMENT_SHADER) {
      shaderTypeName = "Fragment Shader";
    }

    const infoLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);

    throw Error(`Failed to compile ${shaderTypeName}. Error Log:\n${infoLog}`);
  }

  return shader;
}
/**
 * Creates a shader program given the vertex and fragment shader path of that program
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexShaderPath 
 * @param {string} fragmentShaderPath 
 * @returns {WebGLProgram} The compiled and linked program
 */
export async function createShaderProgram(gl, vertexShaderPath, fragmentShaderPath) {
  const vertexShaderSource = await fetch(vertexShaderPath).then(r => r.text());
  const fragmentShaderSource = await fetch(fragmentShaderPath).then(r => r.text());;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  var program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);

    throw new Error(
      `An error occured linking Vertex Shader: ${vertexShaderPath} 
      and Fragment Shader: ${fragmentShaderPath}. Error Log:\n${infoLog}`
    );
  }
  
  return program;
}

/**
 * Creates a shader of shaderType given the shaderSource
 * @param {WebGL2RenderingContext} gl 
 * @param {*} shaderType - The shader type: Either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} shaderSource - The source code of the shader to be compiled
 * @returns {WebGLShader} The compiled shader
 * @throws {Error} Error if compilation failed
 */
function createShader(gl, shaderType, shaderSource) {
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
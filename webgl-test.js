main();

function main() {
  const canvas = document.querySelector("#webgl-canvas");
  const gl = canvas.getContext("webgl");

  // Check for WebGl compatibility
  if (gl === null) {
    alert("WebGL is not supported by your browser");
    return;
  }

  // Paint canvas black
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

}
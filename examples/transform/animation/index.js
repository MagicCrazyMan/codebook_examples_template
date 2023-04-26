import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLBuffer, bindWebGLProgram, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;

  void main() {
    gl_Position = u_ModelMatrix * a_Position;
  }
`;
const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const [aPosition] = bindWebGLBuffer(gl, program, ["a_Position"]);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0.5, -0.43301270189221935, -0.24999999999999997, 0.43301270189221935, -0.24999999999999997,
  ]),
  gl.STATIC_DRAW
);

/**
 * Setups DPS(Degree Per Second) input
 */
const dpsInput = document.getElementById("dps");
let degreePerSecond = dpsInput.value;
dpsInput.addEventListener("input", () => {
  degreePerSecond = dpsInput.value;
});

/**
 * Setups FPS(Frame Per Second) input
 */
let lastTime = null;
const fpsInput = document.getElementById("fps");
let framePerSecond = fpsInput.value;
fpsInput.addEventListener("input", () => {
  framePerSecond = fpsInput.value;
});
// Calculate actual fps
let renderedFrames = 0;
const actualFPSOutput = document.getElementById("actualFPS");
setInterval(() => {
  actualFPSOutput.innerText = renderedFrames;
  renderedFrames = 0;
}, 1000);

/**
 * Setups model matrix
 */
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const modelMatrix = mat4.create();
/**@type {FrameRequestCallback} */
const render = (time) => {
  if (!lastTime) {
    lastTime = time;
    requestAnimationFrame(render);
    return;
  }

  // limit fps
  const offset = time - lastTime;
  if (offset <= 1000 / framePerSecond) {
    requestAnimationFrame(render);
    return;
  }

  // calculate degree that should be used in current frame
  const degrees = ((time / 1000) * degreePerSecond) % 360;

  mat4.identity(modelMatrix);
  // shape keeping
  mat4.scale(modelMatrix, modelMatrix, vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1));
  // rotate
  mat4.rotateZ(modelMatrix, modelMatrix, glMatrix.toRadian(degrees));
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  lastTime = time;
  renderedFrames++;
  requestAnimationFrame(render);
};

render();

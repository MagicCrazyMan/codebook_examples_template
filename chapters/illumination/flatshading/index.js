import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;

  uniform mat4 u_MvpMatrix;

  varying vec4 v_Color;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec4 v_Color;

  void main() {
    gl_FragColor = v_Color;
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups mvp and normal matrix
 */
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const rps = glMatrix.toRadian(20); // Radian Per Second
let lastAnimationTime = 0;
let currentRotation = 0;
const modelMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(6, 6, 14),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
const setModelMatrix = (time) => {
  currentRotation += ((time - lastAnimationTime) / 1000) * rps;
  currentRotation %= 2 * Math.PI;
  mat4.fromYRotation(modelMatrix, currentRotation);
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  render(lastAnimationTime);
});

/**
 * Setups cube
 *   v6----- v5
 *  /|      /|
 * v1------v0|
 * | |     | |
 * | |v7---|-|v4
 * |/      |/
 * v2------v3
 */
// prettier-ignore
const vertices = new Float32Array([
  2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,  // v0-v1-v2- front
  2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0,  // v0-v2-v3 front
  2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,  // v0-v3-v4 right
  2.0, 2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0,  // v0-v4-v5 right
  2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  // v0-v5-v6 up
  2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0,  // v0-v6-v1 up
 -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  // v1-v6-v7 left
 -2.0, 2.0, 2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0,  // v1-v7-v2 left
 -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  // v7-v4-v3 down
 -2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0,  // v7-v3-v2 down
  2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   // v4-v7-v6 back
  2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0   // v4-v6-v5 back
]);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, "a_Position");
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
const colors = new Float32Array(12 * 3 * 3);
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
const aColor = gl.getAttribLocation(program, "a_Color");
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);

/**
 * Setups diffuse light color
 */
const diffuseInputs = [
  document.getElementById("diffuseColorR"),
  document.getElementById("diffuseColorG"),
  document.getElementById("diffuseColorB"),
];
diffuseInputs.forEach((input) => {
  input.addEventListener("input", () => {
    render(lastAnimationTime);
  });
});

/**
 * Setups ambient light
 */
const ambientInputs = [
  document.getElementById("ambientColorR"),
  document.getElementById("ambientColorG"),
  document.getElementById("ambientColorB"),
];
ambientInputs.forEach((input) => {
  input.addEventListener("input", () => {
    render(lastAnimationTime);
  });
});

// prettier-ignore
const normals = [
  vec4.fromValues( 0.0, 0.0, 1.0, 1.0),  // v0-v1-v2 front
  vec4.fromValues( 0.0, 0.0, 1.0, 1.0),  // v0-v2-v3 front
  vec4.fromValues( 1.0, 0.0, 0.0, 1.0),  // v0-v3-v4 right
  vec4.fromValues( 1.0, 0.0, 0.0, 1.0),  // v0-v4-v5 right
  vec4.fromValues( 0.0, 1.0, 0.0, 1.0),  // v0-v5-v6 up
  vec4.fromValues( 0.0, 1.0, 0.0, 1.0),  // v0-v6-v1 up
  vec4.fromValues(-1.0, 0.0, 0.0, 1.0),  // v1-v6-v7 left
  vec4.fromValues(-1.0, 0.0, 0.0, 1.0),  // v1-v7-v2 left
  vec4.fromValues( 0.0,-1.0, 0.0, 1.0),  // v7-v4-v3 down
  vec4.fromValues( 0.0,-1.0, 0.0, 1.0),  // v7-v3-v2 down
  vec4.fromValues( 0.0, 0.0,-1.0, 1.0),  // v4-v7-v6 back
  vec4.fromValues( 0.0, 0.0,-1.0, 1.0),  // v4-v6-v5 back
];
const faceColors = [
  vec3.fromValues(0.4, 0.4, 1.0), // v0-v1-v2 front
  vec3.fromValues(0.4, 0.4, 1.0), // v0-v2-v3 front
  vec3.fromValues(0.4, 1.0, 0.4), // v0-v3-v4 right
  vec3.fromValues(0.4, 1.0, 0.4), // v0-v4-v5 right
  vec3.fromValues(1.0, 0.4, 0.4), // v0-v5-v6 up
  vec3.fromValues(1.0, 0.4, 0.4), // v0-v6-v1 up
  vec3.fromValues(1.0, 1.0, 0.4), // v1-v6-v7 left
  vec3.fromValues(1.0, 1.0, 0.4), // v1-v7-v2 left
  vec3.fromValues(1.0, 1.0, 1.0), // v7-v4-v3 down
  vec3.fromValues(1.0, 1.0, 1.0), // v7-v3-v2 down
  vec3.fromValues(0.4, 1.0, 1.0), // v4-v7-v6 back
  vec3.fromValues(0.4, 1.0, 1.0), // v4-v6-v5 back
];
const lightPosition = vec3.fromValues(2.3, 4.0, 3.5);

const normalMatrixTemp = mat4.create();
const normalTemp = vec4.create();
const normal3Temp = vec3.create();
const centroidTemp = vec4.create();
const centroid3Temp = vec3.create();
const lightColorTemp = vec3.create();
const ambientColorTemp = vec3.create();
const lightDirectionTemp = vec3.create();
const diffuseColorTemp = vec3.create();
const colorTemp = vec3.create();
const flatShading = () => {
  mat4.invert(normalMatrixTemp, modelMatrix);
  mat4.transpose(normalMatrixTemp, normalMatrixTemp);

  vec3.set(
    lightColorTemp,
    parseFloat(diffuseInputs[0].value),
    parseFloat(diffuseInputs[1].value),
    parseFloat(diffuseInputs[2].value)
  );
  vec3.set(
    ambientColorTemp,
    parseFloat(ambientInputs[0].value),
    parseFloat(ambientInputs[1].value),
    parseFloat(ambientInputs[2].value)
  );

  for (let i = 0; i < vertices.length / (3 * 3); i++) {
    const [x0, y0, z0] = vertices.slice(i * 9, i * 9 + 3);
    const [x1, y1, z1] = vertices.slice(i * 9 + 3, i * 9 + 6);
    const [x2, y2, z2] = vertices.slice(i * 9 + 6, i * 9 + 9);

    vec4.set(centroidTemp, (x0 + y0 + z0) / 3, (x1 + y1 + z1) / 3, (x2 + y2 + z2) / 3, 1);
    vec4.copy(normalTemp, normals[i]);
    const color = faceColors[i];

    vec4.transformMat4(centroidTemp, centroidTemp, modelMatrix);
    vec4.transformMat4(normalTemp, normalTemp, normalMatrixTemp);
    vec3.set(centroid3Temp, centroidTemp[0], centroidTemp[1], centroidTemp[2]);
    vec3.set(normal3Temp, normalTemp[0], normalTemp[1], normalTemp[2]);

    const lightDirection = vec3.subtract(lightDirectionTemp, lightPosition, centroid3Temp);
    vec3.normalize(lightDirection, lightDirection);
    vec3.normalize(normalTemp, normalTemp);

    const intensity = Math.max(vec3.dot(lightDirection, normalTemp), 0.0);
    vec3.scale(diffuseColorTemp, lightColorTemp, intensity);
    vec3.multiply(diffuseColorTemp, diffuseColorTemp, color);

    vec3.add(colorTemp, diffuseColorTemp, ambientColorTemp);
    colors.set(colorTemp, i * 9);
    colors.set(colorTemp, i * 9 + 3);
    colors.set(colorTemp, i * 9 + 6);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
};

gl.enable(gl.DEPTH_TEST);
const render = (time) => {
  setModelMatrix(time);
  setMvpMatrix();
  flatShading();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);

import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";
import { createSphere } from "../../../libs/geom/sphere";

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
const modelMatrix = mat4.fromRotation(
  mat4.create(),
  glMatrix.toRadian(60),
  vec3.fromValues(1, 0.5, 0)
);
const cameraPosition = vec3.fromValues(0, 0, 6);
const viewMatrix = mat4.lookAt(
  mat4.create(),
  cameraPosition,
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(50),
    gl.canvas.width / gl.canvas.height,
    1,
    1000
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
});

/**
 * Setups sphere
 */
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
const { indices, vertices } = createSphere(2, 24, 24);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
const colors = new Float32Array(vertices.length);
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

/**
 * Sphere reflection.
 * For ambient, diffuse and specular.
 */
const faceReflection = vec3.fromValues(0.4, 0.4, 1.0);

/**
 * Light position
 */
const lightPosition = vec3.fromValues(10.0, 10.0, 10.0);

/**
 * Setups light properties inputs
 */
const ambientLightInputR = document.getElementById("ambientColorR");
const ambientLightInputG = document.getElementById("ambientColorG");
const ambientLightInputB = document.getElementById("ambientColorB");
const diffuseLightInputR = document.getElementById("diffuseColorR");
const diffuseLightInputG = document.getElementById("diffuseColorG");
const diffuseLightInputB = document.getElementById("diffuseColorB");
const specularLightInputR = document.getElementById("specularColorR");
const specularLightInputG = document.getElementById("specularColorG");
const specularLightInputB = document.getElementById("specularColorB");
const diffuseIntensityInput = document.getElementById("diffuseIntensity");
const specularIntensityInput = document.getElementById("specularIntensity");
const specularExponentInput = document.getElementById("specularExponent");
const attenuationFactorInputA = document.getElementById("attenuationA");
const attenuationFactorInputB = document.getElementById("attenuationB");
const attenuationFactorInputC = document.getElementById("attenuationC");

const normalMatrixTemp = mat4.create();
const normalTemp = vec4.create();
const normal3Temp = vec3.create();
const centroidTemp = vec4.create();
const centroid3Temp = vec3.create();
const lightDirectionTemp = vec3.create();
const reflectionDirectionTemp = vec3.create();
const cameraDirectionTemp = vec3.create();
const ambientLightColorTemp = vec3.create();
const diffuseLightColorTemp = vec3.create();
const specularLightColorTemp = vec3.create();
const ambientColorTemp = vec3.create();
const specularColorTemp = vec3.create();
const diffuseColorTemp = vec3.create();
const colorTemp = vec3.create();
const flatShading = () => {
  const ambient = () => {
    const ambientReflection = faceReflection;
    vec3.set(
      ambientLightColorTemp,
      parseFloat(ambientLightInputR.value),
      parseFloat(ambientLightInputG.value),
      parseFloat(ambientLightInputB.value)
    );

    vec3.mul(ambientColorTemp, ambientLightColorTemp, ambientReflection);
  };
  const diffuse = (attenuation, lightDirection, normal) => {
    const diffuseLightIntensity = parseFloat(diffuseIntensityInput.value);
    vec3.set(
      diffuseLightColorTemp,
      parseFloat(diffuseLightInputR.value),
      parseFloat(diffuseLightInputG.value),
      parseFloat(diffuseLightInputB.value)
    );
    const diffuseReflection = faceReflection;
    const cosine = Math.max(vec3.dot(normal, lightDirection), 0.0);

    vec3.mul(diffuseColorTemp, diffuseLightColorTemp, diffuseReflection);
    vec3.scale(diffuseColorTemp, diffuseColorTemp, diffuseLightIntensity * attenuation * cosine);
  };
  const specular = (attenuation, reflectionDirection, cameraDirection) => {
    const specularLightIntensity = parseFloat(specularIntensityInput.value);
    const specularExponent = parseFloat(specularExponentInput.value);
    vec3.set(
      specularLightColorTemp,
      parseFloat(specularLightInputR.value),
      parseFloat(specularLightInputG.value),
      parseFloat(specularLightInputB.value)
    );
    const specularReflection = faceReflection;
    const cosine = Math.max(vec3.dot(reflectionDirection, cameraDirection), 0.0);
    const specularPower = Math.pow(cosine, specularExponent);

    vec3.mul(specularColorTemp, specularLightColorTemp, specularReflection);
    vec3.scale(
      specularColorTemp,
      specularColorTemp,
      specularLightIntensity * attenuation * specularPower
    );
  };

  // normal matrix
  // const a = mat4.create()
  // mat4.identity(a, a)
  // mat4.mul(a, a, viewMatrix)
  // mat4.mul(a, a, modelMatrix)
  // mat4.transpose(normalMatrixTemp, a);
  // mat4.invert(normalMatrixTemp, normalMatrixTemp);
  mat4.invert(normalMatrixTemp, modelMatrix);
  mat4.transpose(normalMatrixTemp, normalMatrixTemp);

  // attenuation factor
  const attenuationFactorA = parseFloat(attenuationFactorInputA.value);
  const attenuationFactorB = parseFloat(attenuationFactorInputB.value);
  const attenuationFactorC = parseFloat(attenuationFactorInputC.value);

  // iterate every triangles
  for (let i = 0; i < indices.length; i += 3) {
    const index0 = indices[i + 0];
    const index1 = indices[i + 1];
    const index2 = indices[i + 2];

    const [x0, y0, z0] = vertices.slice(index0 * 3 + 0, index0 * 3 + 3);
    const [x1, y1, z1] = vertices.slice(index1 * 3 + 0, index1 * 3 + 3);
    const [x2, y2, z2] = vertices.slice(index2 * 3 + 0, index2 * 3 + 3);

    // position
    vec4.set(centroidTemp, (x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3, 1);
    vec4.transformMat4(centroidTemp, centroidTemp, modelMatrix);
    vec3.set(centroid3Temp, centroidTemp[0], centroidTemp[1], centroidTemp[2]);

    // normalized position equals normal of a sphere
    vec3.copy(normalTemp, centroidTemp);
    vec4.transformMat4(normalTemp, normalTemp, normalMatrixTemp);
    vec3.set(normal3Temp, normalTemp[0], normalTemp[1], normalTemp[2]);
    vec3.normalize(normal3Temp, normal3Temp);

    // light direction
    vec3.subtract(lightDirectionTemp, lightPosition, centroid3Temp);
    vec3.normalize(lightDirectionTemp, lightDirectionTemp);

    // reflection direction
    vec3.scale(reflectionDirectionTemp, normal3Temp, 2 * vec3.dot(lightDirectionTemp, normal3Temp));
    vec3.subtract(reflectionDirectionTemp, reflectionDirectionTemp, lightDirectionTemp);
    vec3.normalize(reflectionDirectionTemp, reflectionDirectionTemp);

    // camera position
    vec3.subtract(cameraDirectionTemp, cameraPosition, centroid3Temp);
    vec3.normalize(cameraDirectionTemp, cameraDirectionTemp);

    // attenuation
    const distance = vec3.distance(lightPosition, centroid3Temp);
    const attenuation =
      1 /
      (attenuationFactorA +
        attenuationFactorB * distance +
        attenuationFactorC * Math.pow(distance, 2));

    ambient();
    diffuse(attenuation, lightDirectionTemp, normal3Temp);
    specular(attenuation, reflectionDirectionTemp, cameraDirectionTemp);

    vec3.zero(colorTemp, colorTemp);
    vec3.add(colorTemp, colorTemp, ambientColorTemp);
    vec3.add(colorTemp, colorTemp, diffuseColorTemp);
    vec3.add(colorTemp, colorTemp, specularColorTemp);

    colors.set(colorTemp, index0 * 3);
    colors.set(colorTemp, index1 * 3);
    colors.set(colorTemp, index2 * 3);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
};

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = (time) => {
  setModelMatrix(time);
  setMvpMatrix();
  flatShading();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { CameraUniformNames } from "../../../libs/camera/Camera";
import { getCanvas, watchInput, watchInputs } from "../../../libs/common";
import { BlenderCamera } from "../../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../../libs/material/Material";

class GouraudShading extends Material {
  name() {
    return "GouraudShading";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
      
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;
    
      uniform vec3 u_CameraPosition;
    
      uniform vec3 u_AmbientReflection;
      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
    
      uniform vec3 u_LightPosition;
      uniform vec3 u_AmbientLightColor;
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_SpecularLightColor;
      uniform float u_SpecularLightShininessExponent;

      uniform float u_DiffuseLightIntensity;
      uniform float u_SpecularLightIntensity;
      uniform vec3 u_LightAttenuations;
    
      varying vec3 v_Color;
    
      /**
       * Calculates ambient reflection color
       */
      vec3 ambient() {
        return u_AmbientLightColor * u_AmbientReflection;
      }
    
      /**
       * Calculates diffuse reflection color
       */
      vec3 diffuse(float attenuation, vec3 normal, vec3 lightDirection) {
        float cosine = max(dot(normal, lightDirection), 0.0);
        return attenuation * u_DiffuseLightIntensity * u_DiffuseLightColor * u_DiffuseReflection * cosine;
      }
    
      /**
       * Calculates specular reflection color
       */
      vec3 specular(float attenuation, vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return attenuation * u_SpecularLightIntensity * u_SpecularLightColor * u_SpecularReflection * power;
      }
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        vec3 position = vec3(u_ModelMatrix * a_Position);
    
        vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
        vec3 lightDirection = normalize(u_LightPosition - position);
        vec3 cameraDirection = normalize(u_CameraPosition - position);
        vec3 reflectionDirection = reflect(-lightDirection, normal);
    
        float distanceToLight = distance(position, u_LightPosition);
        float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * distanceToLight + u_LightAttenuations.z * pow(distanceToLight, 2.0);
        float attenuation = attenuationComponent == 0.0 ? 1.0 : 1.0 / attenuationComponent;
        
        vec3 ambientColor = ambient();
        vec3 diffuseColor = diffuse(attenuation, normal, lightDirection);
        vec3 specularColor = specular(attenuation, normal, reflectionDirection, cameraDirection);
    
        v_Color = ambientColor + diffuseColor + specularColor;
      }
    `;
  }

  fragmentShaderSource() {
    return `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
      
      varying vec3 v_Color;
    
      void main() {
        gl_FragColor = vec4(v_Color, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.Normal),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new MaterialUniformBinding("u_SpecularLightShininessExponent"),
      new MaterialUniformBinding("u_AmbientReflection"),
      new MaterialUniformBinding("u_DiffuseReflection"),
      new MaterialUniformBinding("u_SpecularReflection"),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_AmbientLightColor"),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_DiffuseLightIntensity"),
      new MaterialUniformBinding("u_SpecularLightIntensity"),
      new MaterialUniformBinding("u_LightAttenuations"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  lightPosition = vec3.create();
  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  ambientReflection = vec3.fromValues(0.4, 0.4, 1);
  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = new Float32Array(1);

  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);

  lightAttenuations = vec3.create();

  constructor() {
    super();
    this.uniforms.set("u_LightPosition", new Uniform(UniformType.FloatVector3, this.lightPosition));
    this.uniforms.set(
      "u_AmbientLightColor",
      new Uniform(UniformType.FloatVector3, this.ambientLightColor)
    );
    this.uniforms.set(
      "u_DiffuseLightColor",
      new Uniform(UniformType.FloatVector3, this.diffuseLightColor)
    );
    this.uniforms.set(
      "u_SpecularLightColor",
      new Uniform(UniformType.FloatVector3, this.specularLightColor)
    );
    this.uniforms.set(
      "u_DiffuseLightIntensity",
      new Uniform(UniformType.FloatVector1, this.diffuseLightIntensity)
    );
    this.uniforms.set(
      "u_SpecularLightIntensity",
      new Uniform(UniformType.FloatVector1, this.specularLightIntensity)
    );
    this.uniforms.set(
      "u_LightAttenuations",
      new Uniform(UniformType.FloatVector3, this.lightAttenuations)
    );
    this.uniforms.set(
      "u_SpecularLightShininessExponent",
      new Uniform(UniformType.FloatVector1, this.specularLightShininessExponent)
    );
    this.uniforms.set(
      "u_AmbientReflection",
      new Uniform(UniformType.FloatVector3, this.ambientReflection)
    );
    this.uniforms.set(
      "u_DiffuseReflection",
      new Uniform(UniformType.FloatVector3, this.diffuseReflection)
    );
    this.uniforms.set(
      "u_SpecularReflection",
      new Uniform(UniformType.FloatVector3, this.specularReflection)
    );
  }

  rps = glMatrix.toRadian(20);
  lightBasePosition = vec3.fromValues(0, 5, 5);
  lightPositionModelMatrix = mat4.create();

  /**
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {import("../../../libs/WebGLRenderer").FrameState} frameState
   */
  prerender(entity, frameState) {
    /**
     * Rotates light position per frame
     */
    const rotationOffset = ((frameState.time - frameState.previousTime) / 1000) * this.rps;
    mat4.rotateY(this.lightPositionModelMatrix, this.lightPositionModelMatrix, rotationOffset);
    vec3.transformMat4(this.lightPosition, this.lightBasePosition, this.lightPositionModelMatrix);
  }
}

const gouraudShading = new GouraudShading();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = gouraudShading;

/**
 * Create scene
 */
const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(0, 0, -1),
  })
);

scene.root.addChild(sphere); // add sphere object into scene

/**
 * Setups ambient light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(gouraudShading.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(gouraudShading.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(gouraudShading.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups diffuse light intensity
 */
watchInput("diffuseIntensity", (value) => {
  gouraudShading.diffuseLightIntensity[0] = parseFloat(value);
});
/**
 * Setups specular light intensity
 */
watchInput("specularIntensity", (value) => {
  gouraudShading.specularLightIntensity[0] = parseFloat(value);
});
/**
 * Setups light attenuations
 */
watchInputs(["attenuationA", "attenuationB", "attenuationC"], ([a, b, c]) => {
  vec3.set(gouraudShading.lightAttenuations, parseFloat(a), parseFloat(b), parseFloat(c));
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  gouraudShading.specularLightShininessExponent[0] = parseFloat(value);
});

/**
 * Start rendering
 */
scene.startRendering();

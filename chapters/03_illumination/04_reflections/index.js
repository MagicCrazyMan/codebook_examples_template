import { glMatrix, mat4, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { UniformType } from "../../libs/Constants";
import { Scene } from "../../libs/Scene";
import { Uniform } from "../../libs/Uniform";
import { CameraUniformNames } from "../../libs/camera/Camera";
import { getCanvas, watchInput, watchInputs } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { IndexedCube } from "../../libs/geom/Cube";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialAttributeBinding,
  MaterialUniformBinding,
} from "../../libs/material/Material";
import { Axes } from "../../libs/geom/Axes";

class Reflection extends Material {
  name() {
    return "Reflection";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
      
      attribute vec3 a_AmbientReflection;
      attribute vec3 a_DiffuseReflection;
      attribute vec3 a_SpecularReflection;
    
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;
    
      uniform vec3 u_AmbientLightColor;
    
      varying vec3 v_AmbientColor;
      varying vec3 v_DiffuseReflection;
      varying vec3 v_SpecularReflection;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates ambient reflection color
       */
      vec3 ambient() {
        return u_AmbientLightColor * a_AmbientReflection;
      }
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = vec3(u_NormalMatrix * a_Normal);
    
        v_AmbientColor = ambient();
        v_DiffuseReflection = a_DiffuseReflection;
        v_SpecularReflection = a_SpecularReflection;
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
    
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_SpecularLightColor;
      uniform vec3 u_LightPosition;
      uniform float u_SpecularLightShininessExponent;
    
      uniform vec3 u_CameraPosition;
    
      varying vec3 v_AmbientColor;
      varying vec3 v_DiffuseReflection;
      varying vec3 v_SpecularReflection;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates diffuse reflection color
       */
      vec3 diffuse(vec3 normal, vec3 lightDirection) {
        float cosine = max(dot(normal, lightDirection), 0.0);
        return u_DiffuseLightColor * v_DiffuseReflection * cosine;
      }
    
      /**
       * Calculates specular reflection color
       */
      vec3 specular(vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return u_SpecularLightColor * v_SpecularReflection * power;
      }
    
      void main() {
        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
        vec3 reflectionDirection = reflect(-lightDirection, normal);
        
        vec3 diffuseColor = diffuse(normal, lightDirection);
        vec3 specularColor = specular(normal, reflectionDirection, cameraDirection);
    
        gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.Normal),
      new MaterialAttributeBinding("a_AmbientReflection"),
      new MaterialAttributeBinding("a_DiffuseReflection"),
      new MaterialAttributeBinding("a_SpecularReflection"),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_AmbientLightColor"),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_SpecularLightShininessExponent"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();
  specularLightShininessExponent = new Float32Array(1);

  lightPosition = vec3.fromValues(5, -2, 5);

  // prettier-ignore
  cubeFaceReflections = new Float32Array([
    0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  // front(blue)
    1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  // up(red)
    0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  // back(cyan)
    1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  // bottom(white)
    1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  // left(yellow)
    0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  // right(green)
  ]);

  constructor() {
    super();
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
      "u_SpecularLightShininessExponent",
      new Uniform(UniformType.FloatVector1, this.specularLightShininessExponent)
    );
    this.uniforms.set("u_LightPosition", new Uniform(UniformType.FloatVector3, this.lightPosition));

    const reflectionsDescriptor = new BufferDescriptor(this.cubeFaceReflections);
    this.attributes.set("a_AmbientReflection", new BufferAttribute(reflectionsDescriptor, 3));
    this.attributes.set("a_DiffuseReflection", new BufferAttribute(reflectionsDescriptor, 3));
    this.attributes.set("a_SpecularReflection", new BufferAttribute(reflectionsDescriptor, 3));
  }
}

const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(-1, -0.5, -1),
  })
);

const reflection = new Reflection();

const cube = new IndexedCube(2);
cube.material = reflection;

scene.root.addChild(cube);
scene.root.addChild(new Axes(2));

const dps = glMatrix.toRadian(20); // Radians Per Second
scene.event.addEventListener("prerender", (event) => {
  /**@type {import("../../libs/WebGLRenderer").FrameState} */
  const frameState = event.frameState;
  let r = (frameState.previousTime / 1000) * dps;
  r %= 360;
  cube.setModelMatrix(mat4.fromYRotation(cube.modelMatrix, r));
});

scene.startRendering();

/**
 * Setups ambient light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(reflection.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(reflection.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(reflection.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups light specular shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  reflection.specularLightShininessExponent[0] = parseFloat(value);
});

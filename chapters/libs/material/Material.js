/* eslint-disable @typescript-eslint/no-unused-vars */
import { abstractMethod } from "../Utils.js";

/**
 * Material attribute binding
 */
export class AttributeBinding {
  /**
   * @type {string}
   */
  name;

  /**
   * 
   * @param {string} name 
   */
  constructor(name) {
    this.name = name
  }
}

/**
 * Material uniform binding requiring data from material.
 */
export class MaterialUniformBinding {
  /**
   * @type {string}
   */
  name;
  /**
   * @type {import("../Uniform.js").UniformType}
   */
  type;

  /**
   * 
   * @param {string} name 
   * @param {import("../Uniform.js").UniformType} type 
   */
  constructor(name, type) {
    this.name = name
    this.type = type
  }
}

/**
 * Material uniform binding requiring data from entity.
 */
export class EntityUniformBinding {
  /**
   * @type {string}
   */
  name;
  /**
   * @type {import("../Uniform.js").UniformType}
   */
  type;

  /**
   * 
   * @param {string} name 
   * @param {import("../Uniform.js").UniformType} type 
   */
  constructor(name, type) {
    this.name = name
    this.type = type
  }
}

/**
 * Material uniform binding requiring data from main camera.
 */
export class MainCameraUniformBinding {
  /**
   * @type {string}
   */
  name;
  /**
   * @type {import("../Uniform.js").UniformType}
   */
  type;

  /**
   * 
   * @param {string} name 
   * @param {import("../Uniform.js").UniformType} type 
   */
  constructor(name, type) {
    this.name = name
    this.type = type
  }
}

/**
 * Draw modes, mapping to WebGL enums.
 * @enum {number}
 */
export const DrawMode = {
  Points: 0,
  Lines: 1,
  LineStrip: 2,
  LineLoop: 3,
  Triangles: 4,
  TrianglesFan: 5,
  TrianglesStrip: 6,
};
/**
 * Abstract material
 * @abstract
 */
export class Material {
  /**
   * Returns name of this material.
   * @returns {string}
   */
  name() {
    abstractMethod();
  }
  /**
   * Returns vertex shader source for WebGL program.
   * @returns {string}
   */
  vertexShaderSource() {
    abstractMethod();
  }

  /**
   * Returns fragment shader source for WebGL program.
   * @returns {string}
   */
  fragmentShaderSource() {
    abstractMethod();
  }

  /**
   * Returns attribute bindings for WebGL program.
   * @returns {AttributeBinding[]}
   */
  attributesBindings() {
    abstractMethod();
  }

  /**
   * Returns uniform bindings for WebGL program.
   * @returns {MainCameraUniformBinding[] | EntityUniformBinding[] | MaterialUniformBinding[]}
   */
  uniformBindings() {
    abstractMethod();
  }

  /**
   * Returns draw mode of this material
   * @returns {DrawMode}
   */
  drawMode() {
    abstractMethod();
  }

  /**
   * Uniforms
   * @type {Map<string, import("../Uniform.js").ArrayUniform>}
   * @readonly
   */
  uniforms = new Map();
}
"use strict";

const idlUtils = require("../../lib/utils.js");

exports.implementation = class FileListImpl extends Array {
  constructor() {
    super(0);
  }
  item(index) {
    return this[index] || null;
  }
  get [idlUtils.supportedPropertyIndices]() {
    return this.keys();
  }
};

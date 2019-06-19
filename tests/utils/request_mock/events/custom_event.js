import Event from "./event";

/**
 * @param {string} type
 * @param {Object} customData
 * @param {Object} target
 */
export default function CustomEvent(type, customData, target) {
  this.initEvent(type, false, false, target);
  this.detail = customData.detail || null;
}

CustomEvent.prototype = new Event();
CustomEvent.prototype.constructor = CustomEvent;

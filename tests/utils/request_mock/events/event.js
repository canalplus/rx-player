function Event(type, bubbles, cancelable, target) {
  this.initEvent(type, bubbles, cancelable, target);
}

Event.prototype = {
  initEvent(type, bubbles, cancelable, target) {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.target = target;
    this.currentTarget = target;
  },

  stopPropagation() {},

  preventDefault() {
    this.defaultPrevented = true;
  },
};

export default Event;

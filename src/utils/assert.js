function AssertionError(message) {
  this.name = "AssertionError";
  this.message = message;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AssertionError);
  }
}
AssertionError.prototype = new Error();

/**
 * @param {*} value
 * @param {string} message
 * @throws AssertionError - Throws if the value given is falsy
 */
function assert(value, message) {
  if (!value) {
    throw new AssertionError(message);
  }
}

assert.equal = function(a, b, message) {
  return assert(a === b, message);
};

/**
 * @param {Object} o
 * @param {string} name - name of the _interface_
 * @param {Object} iface - Contains the checked keynames of O and link them
 * to their types (obtained through the typeof operator).
 * @throws AssertionError - The argument o given is not an object
 * @throws AssertionError - The _interface_ is not respected.
 */
assert.iface = function(o, name, iface) {
  assert(o, `${name} should be an object`);
  for (const k in iface) {
    assert.equal(typeof o[k], iface[k], `${name} should have property ${k} as a ${iface[k]}`);
  }
};

export default assert;

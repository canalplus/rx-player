function AssertionError(message) {
  this.name = "AssertionError";
  this.message = message;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AssertionError);
  }
}
AssertionError.prototype = new Error();

function assert(value, message) {
  if (!value) {
    throw new AssertionError(message);
  }
}

assert.equal = function(a, b, message) {
  return assert(a === b, message);
};

assert.iface = function(o, name, iface) {
  assert(o, `${name} should be an object`);
  for (const k in iface) {
    assert.equal(typeof o[k], iface[k], `${name} should have property ${k} as a ${iface[k]}`);
  }
};

module.exports = assert;

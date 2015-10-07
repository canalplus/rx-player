var _ = require("canal-js-utils/misc");
var assert = require("canal-js-utils/assert");
var { be4toi, strToBytes } = require("canal-js-utils/bytes");
var boxName = _.memoize(strToBytes);
var { concat, itobe4 } = require("canal-js-utils/bytes");

function Atom(name, buff) {
  if (__DEV__)
    assert(name.length === 4);

  var len = buff.length + 8;
  return concat(itobe4(len), boxName(name), buff);
}

function findAtomIndex(buf, atomName) {
  if (!buf) {
    return -1;
  }

  var atomNameInt;
  if (typeof atomName == "string")
    atomNameInt = be4toi(boxName(atomName), 0);
  else
    atomNameInt = atomName;

  var i = 0, l = buf.length;

  var name, size;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    if (size <= 0)
      return null;

    if (name === atomNameInt) {
      break;
    }

    i += size;
  }

  if (i >= l)
    return -1;

  assert(i + size <= l, "dash: atom out of range");
  return i;
}

function findAtom(buf, atomName) {
  var index = findAtomIndex(buf, atomName);
  if (index < 0)
    return null;

  var size = be4toi(buf, index);
  return buf.subarray(index + 8, index + size);
}

module.exports = {
  Atom,
  findAtom,
  findAtomIndex,
};

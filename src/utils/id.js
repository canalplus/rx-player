let _lastId = 0;

const generateNewId = () => {
  let newId = 0;
  if (_lastId < Number.MAX_VALUE) {
    newId = _lastId + 1;
  }
  _lastId = newId;
  return "" + newId;
};

export default generateNewId;

const { getRightIndexHelpers } = require("./indexes/index.js");

class RepresentationIndex {
  constructor(args) {
    this._index = args.index;
    this._rootId = args.rootId;
    this._indexHelpers = getRightIndexHelpers(this._index);
  }

  getLiveEdge() {
    return this._indexHelpers.getLiveEdge(this._index);
  }

  getSegments(up, duration) {
    return this._indexHelpers.getSegments(
      this._rootId,
      this._index,
      up,
      duration
    );
  }

  shouldRefresh(time, up, to) {
    return this._indexHelpers.shouldRefresh(this._index, time, up, to);
  }

  getBeginningTime() {
    return this._indexHelpers.getBeginningTime(this._index);
  }

  getEndTime() {
    return this._indexHelpers.getEndTime(this._index);
  }

  // TODO
  addSegment(s) {
    const val = this._indexHelpers.addSegment(s, this._index);
    return val;
  }

  checkDiscontinuity() {
    return this._indexHelpers.checkDiscontinuity(this._index);
  }
}

module.exports = RepresentationIndex;

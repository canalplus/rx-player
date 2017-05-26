const { getRightIndexHelpers } = require("./indexes/index.js");

class RepresentationIndex {
  constructor(args) {
    this._index = args.index;
    this._rootId = args.rootId;
    this._indexHelpers = getRightIndexHelpers(this._index);
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
  }

  getEndTime() {
  }

  getLiveEdge() {
  }

  addSegment() {
  }

  checkDiscontinuity() {
  }
}

module.exports = RepresentationIndex;

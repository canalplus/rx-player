class Segment {
  /**
   * @constructor
   * @param {Object} args
   * @param {string|Number} args.id
   * @param {Number} args.duration
   * @param {Boolean} [args.init=false]
   * @param {Array.<Number>} [args.range]
   * @param {Number} args.time
   * @param {Array.<Number>} [args.indexRange]
   * @param {Number} [args.number]
   * @param {Number} args.timescale
   */
  constructor(args = {}) {
    this.id = args.id;
    this.duration = args.duration;
    this.isInit = !!args.init;
    this.range = args.range;
    this.time = args.time;
    this.indexRange = args.indexRange;
    this.number = args.number;
    this.timescale = args.timescale;
  }
}

export default Segment;

class Segment {
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

export {
  Segment,
};

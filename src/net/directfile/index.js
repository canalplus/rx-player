const { Observable } = require("rxjs/Observable");

const manifestPipeline = {
  parser({ url }) {
    const manifest = {
      transportType: "directfile",
      locations: [url],
      periods: [],
      isLive: false,
      duration: Infinity,
      adaptations: null,
    };

    return Observable.of({ manifest, url });
  },
};

module.exports = {
  directFile: true,
  manifest: manifestPipeline,
};

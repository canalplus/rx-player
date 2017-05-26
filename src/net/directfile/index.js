import { Observable } from "rxjs/Observable";

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

export default {
  directFile: true,
  manifest: manifestPipeline,
};

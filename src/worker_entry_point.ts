import initializeWorker from "./initialize_worker.ts";

initializeWorker({
  // By default, there's no callback defined. An application can define some by
  // importing `./importable_worker.ts` instead.
  representationFilters: new Map(),
  segmentLoaders: new Map(),
  manifestLoaders: new Map(),
});

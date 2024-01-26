const hasMseInWorker =
  typeof MediaSource === "function" &&
  /* eslint-disable-next-line */
  (MediaSource as any).canConstructInDedicatedWorker === true;

export default hasMseInWorker;

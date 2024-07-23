const hasMseInWorker = typeof MediaSource === "function" &&
    /* eslint-disable-next-line */
    MediaSource.canConstructInDedicatedWorker === true;
export default hasMseInWorker;

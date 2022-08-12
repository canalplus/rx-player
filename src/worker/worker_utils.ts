/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { IWorkerPlaybackObservation } from "../main";

export const WASM_URL = "./mpd-parser.wasm";

export const INITIAL_OBSERVATION: IWorkerPlaybackObservation = {
  duration: NaN,
  paused: { last: false },
  position: { last: 0 },
  readyState: 0,
  speed: 1,
};

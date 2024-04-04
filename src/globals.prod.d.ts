/* eslint-disable @typescript-eslint/naming-convention */

// Define build-time constants corresponding to the regular build.

declare const enum __LOGGER_LEVEL__ {
  CURRENT_LEVEL = "NONE",
}

declare const enum __ENVIRONMENT__ {
  PRODUCTION = 0,
  DEV = 1,
  CURRENT_ENV = PRODUCTION,
}

declare const __GLOBAL_SCOPE__: boolean | undefined;

declare const __RX_PLAYER_DEBUG_MODE__: boolean | undefined;

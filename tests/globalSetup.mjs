import createContentServer from "./contents/server.mjs";

const realConsoleWarn = console.warn;
let contentServer;

/**
 * Peform actions we want to setup before tests.
 */
export function setup() {
  removeAnnoyingDeprecationNotice();
  contentServer = createContentServer();
}

/**
 * Peform actions to clean-up after tests.
 */
export function teardown() {
  contentServer?.close();
}

/**
 * Webdriverio just spams a deprecation notice with the current version of
 * vitest (one per test, though as we have thousands of tests, it just fills the
 * output into something unreadable).
 *
 * This is so annoying that I just chose to mute it by monkey-patching the
 * console function here.
 *
 * This should hopefully be very temporary.
 */
function removeAnnoyingDeprecationNotice() {
  console.warn = function (...args) {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith(
        '⚠️ [WEBDRIVERIO DEPRECATION NOTICE] The "switchToFrame" command is deprecated and we encourage everyone to use `switchFrame` instead for switching into frames.',
      )
    ) {
      return;
    }
    return realConsoleWarn.apply(console, args);
  };
}

setup();

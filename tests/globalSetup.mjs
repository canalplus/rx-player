import createContentServer from "./contents/server.mjs";

let contentServer;

let started = false;

/**
 * Peform actions we want to setup before tests.
 */
export function setup() {
  if (started) {
    return; // already started
  }
  contentServer = createContentServer();
  started = true;
}

/**
 * Peform actions to clean-up after tests.
 */
export function teardown() {
  contentServer?.close();
  started = false;
}

import buildEmbeddedTestWorker from "../scripts/build_embedded_test_worker.mjs";
import createContentServer from "./contents/server.mjs";

let contentServer;

let started = false;

/**
 * Peform actions we want to setup before tests.
 */
export async function setup() {
  if (started) {
    return; // already started
  }
  started = true;
  await buildEmbeddedTestWorker();
  contentServer = createContentServer();
}

/**
 * Peform actions to clean-up after tests.
 */
export function teardown() {
  contentServer?.close();
  started = false;
}

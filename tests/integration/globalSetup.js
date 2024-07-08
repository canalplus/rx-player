/* eslint-env node */

import TestContentServer from "../contents/server.mjs";

export default () => {
  // Start the server content prior to unit tests
  const CONTENT_SERVER_PORT = 3000;
  TestContentServer(CONTENT_SERVER_PORT);
};

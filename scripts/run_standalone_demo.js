#!/usr/bin/env node
/* eslint-env node */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const https = require("https");

require("./generate_standalone_demo");

const HTTP_PORT = 8001;
const HTTPS_PORT = 8444;

const app = express();
app.use(express.static(path.join(__dirname, "../demo/standalone/")));

app.listen(HTTP_PORT, (err) => {
  if (err) {
    /* eslint-disable no-console */
    console.log(err);
    /* eslint-enable no-console */
    return;
  }
  /* eslint-disable no-console */
  console.log(`Listening HTTP at http://localhost:${HTTP_PORT}`);
  /* eslint-enable no-console */
});

Promise.all([
  promisify(fs.readFile)(path.join(__dirname, "../localhost.crt")),
  promisify(fs.readFile)(path.join(__dirname, "../localhost.key")),
]).then(([pubFile, privFile]) => {
  if (pubFile != null && privFile != null) {
    https.createServer({
      key: privFile,
      cert: pubFile,
    }, app).listen(HTTPS_PORT, (err) => {
      if (err) {
        /* eslint-disable no-console */
        console.log(err);
        /* eslint-enable no-console */
        return;
      }
      /* eslint-disable no-console */
      console.log(`Listening HTTPS at https://localhost:${HTTPS_PORT}`);
      /* eslint-enable no-console */
    });
  }
}, (err) => {
  if (err.code === "ENOENT") {
    /* eslint-disable no-console */
    console.warn("Not launching the demo in HTTPS: certificate not generated.");
    console.info("You can run `npm run certificate` to generate a certificate.");
    /* eslint-enable no-console */
  } else {
    /* eslint-disable no-console */
    console.error(err);
    /* eslint-enable no-console */
  }
});

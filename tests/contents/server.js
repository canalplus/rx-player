/* eslint-env node */

const http = require("http");
const fs = require("fs");
const urls = require("./urls");

// Transform `urls` array into an Object where the key is the url of each
// element.
const routeObj = urls.reduce((acc, elt) => {
  acc[elt.url] = elt;
  return acc;
}, {});

/**
 * Create simple HTTP server specifically designed to serve the contents defined
 * in this directory.
 * @param {number} port
 * @returns {Object}
 */
module.exports = function createServer(port) {
  const server = http.createServer(function(req, res) {
    if (routeObj[req.url] == null) {
      res.setHeader("Content-Type", "text/plain");
      answerWithCORS(res, 404, "404 Page Not Found");
      return;
    }
    if (req.method.toUpperCase() === "OPTIONS") {
      answerWithCORS(res, 200);
      res.end();
      return;
    }
    if (req.method.toUpperCase() !== "GET") {
      res.setHeader("Content-Type", "text/plain");
      answerWithCORS(res, 405, "405 Method Not Allowed");
      return;
    }

    const urlObj = routeObj[req.url];
    let data;
    if (typeof urlObj.path === "string") {
      try {
        data = fs.readFileSync(urlObj.path);
      } catch(err) {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 404, "404 Page Not Found");
        return;
      }
    } else {
      data = urlObj.data;
      try { data = Buffer.from(data); } catch (_e) {}
      answerWithCORS(res, 200, data);
      return;
    }

    const rangeHeader = req.headers["Range"] || req.headers["range"];
    let isPartial = false;
    if (typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
      const dataLength = data.byteLength;
      const ranges = parseRangeHeader(rangeHeader, dataLength);
      data = data.slice(ranges[0], ranges[1] + 1);
      res.setHeader(
        "Content-Range",
        `bytes ${ranges[0]}-${ranges[1]}/${dataLength}`);
      isPartial = true;
    }
    if (typeof urlObj.postProcess === "function") {
      data = urlObj.postProcess(data);
    }
    if (typeof urlObj.contentType === "string") {
      res.setHeader("Content-Type", urlObj.contentType);
    }
    answerWithCORS(res, isPartial ? 206 : 200, Buffer.from(data));
  }).listen(port);

  return {
    close() {
      server.close();
    },
  };
};

/**
 * Add CORS headers, Content-Length, body, HTTP status and answer with the
 * Response Object given.
 * @param {Response} res
 * @param {number} status
 * @param {*} body
 */
function answerWithCORS(res, status, body) {
  if (Buffer.isBuffer(body)) {
    res.setHeader("Content-Length", body.byteLength);
  }
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  });
  if (body !== undefined) {
    res.end(body);
  } else {
    res.end();
  }
  return;
}

/**
 * Parse value of the "Range" header into an array of two numbers, which are
 * specifically the start and end range wanted included.
 * @param {string} rangeHeader
 * @param {number} dataLength
 * @returns {Array.<number>}
 */
function parseRangeHeader(rangeHeader, dataLength) {
  const rangesStr = rangeHeader.substr(6).split("-");
  if (
    rangesStr[0] != "" && Number.isNaN(+rangesStr[0]) ||
    rangesStr[1] != "" && Number.isNaN(+rangesStr[1])
  ) {
    throw new Error("Invalid range request");
  }
  const rangesNb = rangesStr.map(x => x === "" ? null : +x);
  if (rangesNb[1] == null) {
    return [rangesNb[0], dataLength - 1];
  }
  if (rangesNb[1] <= rangesNb[0]) {
    return [0, 0];
  }
  if (rangesNb[0] == null || rangesNb === 0) {
    if (rangesNb[1] == null) {
      return [0, dataLength - 1];
    }
    return [0, rangesNb[1]];
  }
  return [rangesNb[0], rangesNb[1]];
}

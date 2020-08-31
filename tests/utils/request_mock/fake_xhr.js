import * as Events from "./events";

export const originalXHR = window.XMLHttpRequest;

const XHR_STATES = { UNSENT: 0,
                     OPENED: 1,
                     HEADERS_RECEIVED: 2,
                     LOADING: 3,
                     DONE: 4 };

const STATUS_TEXTS = { 100: "Continue",
                       101: "Switching Protocols",
                       200: "OK",
                       201: "Created",
                       202: "Accepted",
                       203: "Non-Authoritative Information",
                       204: "No Content",
                       205: "Reset Content",
                       206: "Partial Content",
                       207: "Multi-Status",
                       300: "Multiple Choice",
                       301: "Moved Permanently",
                       302: "Found",
                       303: "See Other",
                       304: "Not Modified",
                       305: "Use Proxy",
                       307: "Temporary Redirect",
                       400: "Bad Request",
                       401: "Unauthorized",
                       402: "Payment Required",
                       403: "Forbidden",
                       404: "Not Found",
                       405: "Method Not Allowed",
                       406: "Not Acceptable",
                       407: "Proxy Authentication Required",
                       408: "Request Timeout",
                       409: "Conflict",
                       410: "Gone",
                       411: "Length Required",
                       412: "Precondition Failed",
                       413: "Request Entity Too Large",
                       414: "Request-URI Too Long",
                       415: "Unsupported Media Type",
                       416: "Requested Range Not Satisfiable",
                       417: "Expectation Failed",
                       422: "Unprocessable Entity",
                       500: "Internal Server Error",
                       501: "Not Implemented",
                       502: "Bad Gateway",
                       503: "Service Unavailable",
                       504: "Gateway Timeout",
                       505: "HTTP Version Not Supported" };

// https://fetch.spec.whatwg.org/#forbidden-header-name
const FORBIDDEN_HEADERS = [ "Accept-Charset",
                            "Accept-Encoding",
                            "Access-Control-Request-Headers",
                            "Access-Control-Request-Method",
                            "Connection",
                            "Content-Length",
                            "Content-Transfer-Encoding",
                            "Cookie",
                            "Cookie2",
                            "DNT",
                            "Date",
                            "Expect",
                            "Host",
                            "Keep-Alive",
                            "Origin",
                            "Referer",
                            "TE",
                            "Trailer",
                            "Transfer-Encoding",
                            "Upgrade",
                            "User-Agent",
                            "Via" ];

function EventTargetHandler() {
  const self = this;
  const events = [ "loadstart",
                   "progress",
                   "abort",
                   "error",
                   "load",
                   "timeout",
                   "loadend" ];

  function addEventListener(eventName) {
    self.addEventListener(eventName, function (event) {
      const listener = self["on" + eventName];

      if (listener && typeof listener === "function") {
        listener.call(this, event);
      }
    });
  }

  events.forEach(addEventListener);
}

EventTargetHandler.prototype = Events.EventTarget;

/**
 * XHR implementation for mocking usages.
 * Heavily inspired from nise.
 */
export function FakeXMLHttpRequest() {
  EventTargetHandler.call(this);
  this.readyState = XHR_STATES.UNSENT;
  this.requestHeaders = {};
  this.requestBody = null;
  this.status = 0;
  this.statusText = "";
  this.upload = new EventTargetHandler();
  this.responseType = "";
  this.response = "";
  this.timeout = 0;
  this.withCredentials = false;

  // Callback which will be called when xhr.send is called
  this._onSend = null;

  // Return true if the current request should be mocked
  this._shouldMock = () => false;

  // Promise which resolve when the request is done or was aborted
  this._finished = new Promise((res) => {
    this.__finishPromise = res;
  });
  if (typeof FakeXMLHttpRequest._onCreate === "function") {
    FakeXMLHttpRequest._onCreate(this);
  }
}

Object.assign(FakeXMLHttpRequest.prototype, Events.EventTarget, {
  async: true,

  open(...args) {
    const [ method, url, async, username, password ] = args;
    this.method = method;
    this.url = url;
    this.async = typeof async === "boolean" ? async : true;
    this.username = username;
    this.password = password;
    clearResponse(this);
    this.requestHeaders = {};
    this.sendFlag = false;

    if (!this._shouldMock(this, args)) {
      resetOnOpen(this, args);
      return;
    }
    updateReadyState(this, FakeXMLHttpRequest.OPENED);
  },

  /**
   * Add a header to the current request.
   * @see https://xhr.spec.whatwg.org/#dom-xmlhttprequest-setrequestheader
   * @param {string} name
   * @param {string} value
   */
  setRequestHeader(name, value) {
    if (typeof this._onSetRequestHeader === "function") {
      this._onSetRequestHeader(name, value);
    }
    if (typeof value !== "string") {
      throw new TypeError("By RFC7230, section 3.2.4, header values should " +
                          " be strings. Got " + typeof value);
    }
    if (this.readyState !== XHR_STATES.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }
    if (this.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }

    // https://fetch.spec.whatwg.org/#forbidden-header-name
    if (FORBIDDEN_HEADERS.includes(name) || /^(Sec-|Proxy-)/i.test(name)) {
      throw new Error(`Refused to set unsafe header "${name}"`);
    }

    const normalizedValue = normalizeHeaderValue(value);
    const existingName = getHeaderName(this.requestHeaders, name);
    if (existingName != null) {
      this.requestHeaders[existingName] += ", " + normalizedValue;
    } else {
      this.requestHeaders[name] = normalizedValue;
    }
  },

  // Currently treats ALL data as a DOMString (i.e. no Document)
  send(data) {
    if (this.readyState !== XHR_STATES.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }
    if (this.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }

    if (!/^(head)$/i.test(this.method)) {
      const contentType = getHeaderName(this.requestHeaders, "Content-Type");
      if (this.requestHeaders[contentType]) {
        const value = this.requestHeaders[contentType].split(";");
        this.requestHeaders[contentType] = value[0] + ";charset=utf-8";
      }

      this.requestBody = data;
    }

    this.errorFlag = false;
    this.sendFlag = this.async;
    clearResponse(this);
    updateReadyState(this, FakeXMLHttpRequest.OPENED);

    if (typeof this._onSend === "function") {
      this._onSend(this);
    }


    // Only listen if setInterval and Date are a stubbed.
    if (typeof setInterval.clock === "object" && typeof Date.clock === "object") {
      const initiatedTime = Date.now();
      const self = this;

      // Listen to any possible tick by fake timers and check to see if timeout
      // has been exceeded. It's important to note that timeout can be changed
      // while a request is in flight, so we must check anytime the end user
      // forces a clock tick to make sure timeout hasn't changed.
      // https://xhr.spec.whatwg.org/#dfnReturnLink-2
      const clearIntervalId = setInterval(function () {
        // Check if the readyState has been reset or is done. If this is the
        // case, there should be no timeout. This will also prevent aborted
        // requests and fakeServerWithClock from triggering unnecessary
        // responses.
        if (self.readyState === FakeXMLHttpRequest.UNSENT ||
            self.readyState === FakeXMLHttpRequest.DONE)
        {
          clearInterval(clearIntervalId);
        } else if (typeof self.timeout === "number" && self.timeout > 0) {
          if (Date.now() >= (initiatedTime + self.timeout)) {
            triggerTimeout(self);
            clearInterval(clearIntervalId);
          }
        }
      }, 1);
    }

    this.dispatchEvent(new Events.Event("loadstart", false, false, this));
  },

  /**
   * Abort the given request (do not send it).
   */
  abort() {
    this.aborted = true;
    requestErrorSteps(this);
    updateReadyState(this, FakeXMLHttpRequest.UNSENT);
  },

  error() {
    clearResponse(this);
    this.errorFlag = true;
    this.requestHeaders = {};
    this.responseHeaders = {};

    updateReadyState(this, FakeXMLHttpRequest.DONE);
  },

  /**
   * @param {string} header
   * @returns {string|null}
   */
  getResponseHeader(header) {
    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
      return null;
    }

    if (/^Set-Cookie2?$/i.test(header)) {
      return null;
    }

    const realHeader = getHeaderName(this.responseHeaders, header);
    return this.responseHeaders[realHeader] || null;
  },

  /**
   * @returns {string}
   */
  getAllResponseHeaders() {
    if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
      return "";
    }

    const responseHeaders = this.responseHeaders;
    return Object.keys(responseHeaders).reduce(function (prev, header) {
      const value = responseHeaders[header];
      return prev + (header + ": " + value + "\r\n");
    }, "");
  },

  /**
   * Manually respond (/!\ only for mocked requests)
   * @param {number} status
   * @param {Object} headers
   * @param {*} body
   */
  respond(status, headers, body) {
    setStatus(this, status);
    setResponseHeaders(this, headers || {});
    setResponseBody(this, body || "");
  },

  uploadProgress(progressEventRaw) {
    this.upload.dispatchEvent(new Events.ProgressEvent("progress", progressEventRaw, this.upload));
  },

  downloadProgress(progressEventRaw) {
    this.dispatchEvent(new Events.ProgressEvent("progress", progressEventRaw, this));
  },

  uploadError(error) {
    this.upload.dispatchEvent(new Events.CustomEvent("error", {detail: error}));
  },

  overrideMimeType(type) {
    if (this.readyState >= FakeXMLHttpRequest.LOADING) {
      throw new Error("INVALID_STATE_ERR");
    }
    this.overriddenMimeType = type;
  },
});

Object.assign(FakeXMLHttpRequest, XHR_STATES);
Object.assign(FakeXMLHttpRequest.prototype, XHR_STATES);

export default function useFakeXMLHttpRequest() {
  FakeXMLHttpRequest.restore = function restore() {
    window.XMLHttpRequest = originalXHR;
    delete FakeXMLHttpRequest.restore;
  };
  window.XMLHttpRequest = FakeXMLHttpRequest;
  return FakeXMLHttpRequest;
}

// ================= PRIVATE METHODS =====================

/**
 * @param {FakeXMLHttpRequest} fakeXhr
 */
function triggerTimeout(fakeXhr) {
  fakeXhr.timedOut = true;
  requestErrorSteps(fakeXhr);
}

/**
 * Set the response headers according to the key and values of the given
 * object.
 * @throws Error - Throws if the request is not opened.
 * @param {FakeXMLHttpRequest} fakeXhr
 * @param {Object} headers
 */
function setResponseHeaders(fakeXhr, headers) {
  if (fakeXhr.readyState !== FakeXMLHttpRequest.OPENED) {
    throw new Error("INVALID_STATE_ERR - " + fakeXhr.readyState);
  }

  const responseHeaders = fakeXhr.responseHeaders = {};

  Object.keys(headers).forEach(function (header) {
    responseHeaders[header] = headers[header];
  });

  if (fakeXhr.async) {
    updateReadyState(fakeXhr, FakeXMLHttpRequest.HEADERS_RECEIVED);
  } else {
    fakeXhr.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
  }
}

/**
 * Set corresponding status and statusText on the XHR.
 * @throws Error - Throws if the request is not opened.
 * @param {FakeXMLHttpRequest} fakeXhr
 * @param {number} status
 */
function setStatus(fakeXhr, status) {
  if (fakeXhr.readyState !== FakeXMLHttpRequest.OPENED) {
    throw new Error("INVALID_STATE_ERR - " + fakeXhr.readyState);
  }
  fakeXhr.status = status;
  fakeXhr.statusText = STATUS_TEXTS[status];
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeHeaderValue(value) {
  // https://fetch.spec.whatwg.org/#concept-header-value-normalize
  return value.replace(/^[\x09\x0A\x0D\x20]+|[\x09\x0A\x0D\x20]+$/g, "");
}

/**
 * Retrieve corresponding header from the list of headers.
 * `null` if not found.
 * @param {Object} headers
 * @param {string} header
 * @returns {Object|null}
 */
function getHeaderName(headers, header) {
  const foundHeader = Object.keys(headers).filter(function (h) {
    return h.toLowerCase() === header.toLowerCase();
  });
  return foundHeader[0] || null;
}

/**
 * Convert text given into an XML Document.
 * Return `null` if an error was encountered.
 * @param {string} text
 * @returns {Document|null}
 */
function toXML(text) {
  if (text === "" || typeof DOMParser === "undefined") {
    return null;
  }
  try {
    const parser = new DOMParser();
    let parsererrorNS = "";

    try {
      const parsererrors = parser
        .parseFromString("INVALID", "text/xml")
        .getElementsByTagName("parsererror");
      if (parsererrors.length) {
        parsererrorNS = parsererrors[0].namespaceURI;
      }
    } catch (e) {
      // passing invalid XML makes IE11 throw
      // so no namespace needs to be determined
    }

    let result;
    try {
      result = parser.parseFromString(text, "text/xml");
    } catch (err) {
      return null;
    }

    return result.getElementsByTagNameNS(parsererrorNS, "parsererror")
      .length ? null : result;
  } catch (e) {}
  return null;
}

/**
 * Update the ready state and send corresponding events.
 * @param {FakeXMLHttpRequest} fakeXhr
 * @param {string} state
 */
function updateReadyState(fakeXhr, state) {
  fakeXhr.readyState = state;

  if (state === FakeXMLHttpRequest.UNSENT) {
    fakeXhr.__finishPromise();
    return;
  }

  const readyStateChangeEvent = new Events.Event("readystatechange",
                                                 false,
                                                 false,
                                                 fakeXhr);
  let evtName, progress;

  if (typeof fakeXhr.onreadystatechange === "function") {
    try {
      fakeXhr.onreadystatechange(readyStateChangeEvent);
    } catch (e) {
      fakeXhr.logError("Fake XHR onreadystatechange handler", e);
    }
  }

  if (fakeXhr.readyState === FakeXMLHttpRequest.DONE) {
    if (fakeXhr.timedOut || fakeXhr.aborted || fakeXhr.status === 0) {
      progress = { loaded: 0, total: 0 };
      if (fakeXhr.timedOut) {
        evtName = "timeout";
      } else if (fakeXhr.aborted) {
        evtName = "abort";
      } else {
        evtName = "error";
      }
    } else {
      progress = { loaded: 100, total: 100 };
      evtName = "load";
    }

    fakeXhr.upload.dispatchEvent(new Events.ProgressEvent("progress",
                                                          progress,
                                                          fakeXhr));
    fakeXhr.upload.dispatchEvent(new Events.ProgressEvent(evtName,
                                                          progress,
                                                          fakeXhr));
    fakeXhr.upload.dispatchEvent(new Events.ProgressEvent("loadend",
                                                          progress,
                                                          fakeXhr));

    fakeXhr.dispatchEvent(new Events.ProgressEvent("progress", progress, fakeXhr));
    fakeXhr.dispatchEvent(new Events.ProgressEvent(evtName, progress, fakeXhr));
    fakeXhr.dispatchEvent(readyStateChangeEvent);
    fakeXhr.dispatchEvent(new Events.ProgressEvent("loadend", progress, fakeXhr));
    fakeXhr.__finishPromise();
  } else {
    fakeXhr.dispatchEvent(readyStateChangeEvent);
  }
}

/**
 * @param {FakeXMLHttpRequest} fakeXhr
 * @param {*} body
 */
function setResponseBody(fakeXhr, body) {
  if (fakeXhr.readyState === XHR_STATES.DONE) {
    throw new Error("Request done");
  }
  if (fakeXhr.async && fakeXhr.readyState !== XHR_STATES.HEADERS_RECEIVED) {
    throw new Error("No headers received");
  }
  verifyResponseBodyType(body, fakeXhr.responseType);
  const contentType = fakeXhr.overriddenMimeType ||
                      fakeXhr.getResponseHeader("Content-Type");

  const isTextResponse = fakeXhr.responseType === "" ||
                         fakeXhr.responseType === "text";
  clearResponse(fakeXhr);

  if (fakeXhr.async) {
    const chunkSize = fakeXhr.chunkSize || 10;
    let index = 0;

    do {
      updateReadyState(fakeXhr, FakeXMLHttpRequest.LOADING);
      if (isTextResponse) {
        const newSubstr = body.substring(index, index + chunkSize);
        fakeXhr.responseText = fakeXhr.response += newSubstr;
      }
      index += chunkSize;
    } while (index < body.length);
  }

  fakeXhr.response = convertResponseBody(fakeXhr.responseType,
                                         contentType,
                                         body);
  if (isTextResponse) {
    fakeXhr.responseText = fakeXhr.response;
  }

  if (fakeXhr.responseType === "document") {
    fakeXhr.responseXML = fakeXhr.response;
  } else if (fakeXhr.responseType === "" && isXmlContentType(contentType)) {
    fakeXhr.responseXML = toXML(fakeXhr.responseText);
  }
  updateReadyState(fakeXhr, FakeXMLHttpRequest.DONE);
}

/**
 * @param {FakeXMLHttpRequest} fakeXhr
 * @param {Array} xhrArgs
 */
function resetOnOpen(fakeXhr, xhrArgs) {
  const realXHR = new originalXHR();
  const methods = [ "open",
                    "abort",
                    "getResponseHeader",
                    "getAllResponseHeaders",
                    "addEventListener",
                    "overrideMimeType",
                    "removeEventListener" ];

  methods.forEach(function (method) {
    fakeXhr[method] = function (...args) {
      return realXHR[method](...args);
    };
  });

  fakeXhr.setRequestHeader = function setRequestHeader(name, value, ...args) {
    if (typeof fakeXhr._onSetRequestHeader === "function") {
      fakeXhr._onSetRequestHeader(name, value);
    }
    return realXHR.setRequestHeader(name, value, ...args);
  };

  fakeXhr.send = function send(data) {
    if (typeof fakeXhr._onSend === "function") {
      fakeXhr._onSend(data);
    }
  };

  fakeXhr.actuallySend = function actuallySend(data) {
    if (realXHR.responseType !== fakeXhr.responseType) {
      realXHR.responseType = fakeXhr.responseType;
    }
    return realXHR.send(data);
  };

  function setXHRAttrs(args) {
    args.forEach(function (attr) {
      fakeXhr[attr] = realXHR[attr];
    });
  }

  function onReadyStateChangeBefore() {
    fakeXhr.readyState = realXHR.readyState;
    if (realXHR.readyState >= XHR_STATES.HEADERS_RECEIVED) {
      setXHRAttrs(["status", "statusText"]);
    }
    if (realXHR.readyState >= FakeXMLHttpRequest.LOADING) {
      setXHRAttrs(["response"]);
      if (realXHR.responseType === "" || realXHR.responseType === "text") {
        setXHRAttrs(["responseText"]);
      }
    }
    if (
      realXHR.readyState === FakeXMLHttpRequest.DONE &&
      (realXHR.responseType === "" || realXHR.responseType === "document")
    ) {
      setXHRAttrs(["responseXML"]);
    }
  }

  function onReadyStateChangeAfter() {
    if (fakeXhr.onreadystatechange) {
      fakeXhr.onreadystatechange.call(fakeXhr, { target: fakeXhr,
                                                 currentTarget: fakeXhr });
    }
  }

  realXHR.addEventListener("readystatechange", onReadyStateChangeBefore);
  Object.keys(fakeXhr._listeners).forEach(function (event) {
    fakeXhr._listeners[event].forEach(function (handler) {
      realXHR.addEventListener(event,
                               handler.listener,
                               { capture: handler.capture,
                                 once: handler.once });
    });
  });

  function onLoadEndAfter() {
    fakeXhr.__finishPromise();
  }
  realXHR.addEventListener("readystatechange", onReadyStateChangeAfter);
  realXHR.addEventListener("loadend", onLoadEndAfter);
  realXHR.open(...xhrArgs);
}

/**
 * Check that the response's body set can be converted to the given
 * responseType.
 * Throw if not.
 * @param {*} body
 * @param {string|undefined} responseType
 */
function verifyResponseBodyType(body, responseType) {
  let error = null;
  if (responseType === "arraybuffer") {
    if (typeof body !== "string" && !(body instanceof ArrayBuffer)) {
      error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                        body + ", which is not a string or ArrayBuffer.");
      error.name = "InvalidBodyException";
    }
  } else if (typeof body !== "string") {
    error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                      body + ", which is not a string.");
    error.name = "InvalidBodyException";
  }

  if (error) {
    throw error;
  }
}

/**
 * @param {ArrayBuffer|string} body
 * @param {string|undefined} encoding
 * @returns {ArrayBuffer}
 */
function convertToArrayBuffer(body, encoding) {
  if (body instanceof ArrayBuffer) {
    return body;
  }
  return new TextEncoder(encoding || "utf-8").encode(body).buffer;
}

/**
 * @param {string|undefined} contentType
 * @returns {boolean}
 */
function isXmlContentType(contentType) {
  return !contentType ||
         /(text\/xml)|(application\/xml)|(\+xml)/.test(contentType);
}

/**
 * Convert the response's body into the given responseType.
 * @param {string} responseType
 * @param {string} contentType
 * @returns {string|ArrayBuffer|Document|Blob|null|Object}
 */
function convertResponseBody(responseType, contentType, body) {
  if (responseType === "" || responseType === "text") {
    return body;
  } else if (responseType === "arraybuffer") {
    return convertToArrayBuffer(body);
  } else if (responseType === "json") {
    try {
      return JSON.parse(body);
    } catch (e) {
      // Return parsing failure as null
      return null;
    }
  } else if (responseType === "blob") {
    const blobOptions = {};
    if (contentType) {
      blobOptions.type = contentType;
    }
    return new Blob([convertToArrayBuffer(body)], blobOptions);
  } else if (responseType === "document") {
    if (isXmlContentType(contentType)) {
      return toXML(body);
    }
    return null;
  }
  throw new Error("Invalid responseType " + responseType);
}

/**
 * Clear the response properties of the given XHR.
 * @param {XMLHttpRequest} xhr
 */
function clearResponse(xhr) {
  if (xhr.responseType === "" || xhr.responseType === "text") {
    xhr.response = xhr.responseText = "";
  } else {
    xhr.response = xhr.responseText = null;
  }
  xhr.responseXML = null;
}

/**
 * Steps to follow when there is an error, according to:
 * https://xhr.spec.whatwg.org/#request-error-steps
 * @param {FakeXMLHttpRequest} fakeXhr
 */
function requestErrorSteps(fakeXhr) {
  clearResponse(fakeXhr);
  fakeXhr.errorFlag = true;
  fakeXhr.requestHeaders = {};
  fakeXhr.responseHeaders = {};

  if (fakeXhr.readyState !== XHR_STATES.UNSENT && fakeXhr.sendFlag
      && fakeXhr.readyState !== XHR_STATES.DONE)
  {
    updateReadyState(fakeXhr, XHR_STATES.DONE);
    fakeXhr.sendFlag = false;
  }
}

const { Observable } = require("rxjs/Observable");
const { Subscriber } = require("rxjs/Subscriber");
const { RequestError, RequestErrorTypes } = require("./errors");

function createXHRDefault() {
  return new XMLHttpRequest();
}

function toJSONForIE(data) {
  try {
    return JSON.parse(data);
  } catch(e) {
    return null;
  }
}

class RequestResponse {
  constructor(status,
              url,
              responseType,
              sentTime,
              receivedTime,
              size,
              responseData) {
    this.status = status;
    this.url = url;
    this.responseType = responseType;
    this.sentTime = sentTime;
    this.receivedTime = receivedTime;
    this.duration = this.receivedTime - this.sentTime;
    this.size = size;
    this.responseData = responseData;
  }
}

class RequestObservable extends Observable {
  constructor(options) {
    super();

    const request = {
      url: "",
      createXHR: createXHRDefault,
      headers: null,
      method: "GET",
      responseType: "json",
      timeout: 15 * 1000,
      resultSelector: null,
      body: null,
    };

    for (const prop in options) {
      request[prop] = options[prop];
    }

    this.request = request;
  }

  _subscribe(subscriber) {
    return new RequestSubscriber(subscriber, this.request);
  }
}


class RequestSubscriber extends Subscriber {
  constructor(destination, request) {
    super(destination);

    this.request = request;
    this.sentTime = Date.now();
    this.receivedTime = 0;

    this.xhr = null;
    this.done = false;
    this.resultSelector = request.resultSelector;
    this.send();
  }

  next() {
    this.done = true;
    const { resultSelector, xhr, request, destination } = this;

    const status = xhr.status;
    const responseType = this.responseType;
    const size = this.totalSize;
    const sentTime = this.sentTime;
    const receivedTime = this.receivedTime;
    const url = xhr.responseURL || request.url;

    let responseData;
    if (request.responseType == "json") {
      // IE bug where response is string with responseType json
      if (typeof xhr.response != "string") {
        responseData = xhr.response;
      } else {
        responseData = toJSONForIE(xhr.responseText);
      }
    } else {
      responseData = xhr.response;
    }

    if (responseData == null) {
      destination.error(new RequestError(this, request, RequestErrorTypes.PARSE_ERROR));
      return;
    }

    const response = new RequestResponse(
      status,
      url,
      responseType,
      sentTime,
      receivedTime,
      size,
      responseData
    );

    if (resultSelector) {
      destination.next(resultSelector(response));
    } else {
      destination.next(response);
    }
  }

  setHeaders(xhr, headers) {
    for (const key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }

  setupEvents(xhr, request) {
    xhr.ontimeout = function xhrTimeout() {
      const {subscriber, request } = (xhrTimeout);
      subscriber.error(new RequestError(this, request, RequestErrorTypes.TIMEOUT));
    };
    (xhr.ontimeout).request = request;
    (xhr.ontimeout).subscriber = this;

    xhr.onerror = function xhrError() {
      const { subscriber, request } = (xhrError);
      subscriber.error(new RequestError(this, request, RequestErrorTypes.ERROR_EVENT));
    };
    (xhr.onerror).request = request;
    (xhr.onerror).subscriber = this;

    xhr.onload = function xhrOnLoad(e) {
      if (this.readyState === 4) {
        const { subscriber, request } = (xhrOnLoad);
        subscriber.receivedTime = Date.now();
        subscriber.totalSize = e.total;
        const status = this.status;
        if (200 <= status && status < 300) {
          subscriber.next(e);
          subscriber.complete();
        } else {
          subscriber.error(new RequestError(this, request, RequestErrorTypes.ERROR_HTTP_CODE));
        }
      }
    };
    (xhr.onload).subscriber = this;
    (xhr.onload).request = request;
  }

  send() {
    const {
      request,
      request: { method, url, headers, body, responseType, timeout },
    } = this;

    const xhr = (request.createXHR || createXHRDefault)(request);

    this.xhr = xhr;
    xhr.open(method, url, true);

    xhr.timeout = timeout;
    xhr.responseType = responseType;

    if (responseType == "document") {
      xhr.overrideMimeType("text/xml");
    }

    if (headers) {
      this.setHeaders(xhr, headers);
    }

    this.setupEvents(xhr, request);

    if (body) {
      xhr.send(body);
    } else {
      xhr.send();
    }
  }

  unsubscribe() {
    const { done, xhr } = this;
    if (!done && xhr && xhr.readyState !== 4) {
      xhr.abort();
    }
    xhr.ontimeout = null;
    xhr.onerror = null;
    xhr.onload = null;
    super.unsubscribe();
  }
}

/**
 * Creates an observable HTTP request.
 * The options that can be passed are:
 *
 *    - url            Request's url
 *    - [method]       HTTP method (defaults is "GET")
 *    - [data]         Sent data for "POST", "UPDATE" or "PATCH" requests
 *    - [headers]      Object containing headers key/value
 *    - [responseType] Format of the response, according to the XMLHttpRequest Level 2
 *                     response type: "arraybuffer", "blob", "document", "json" or "text" (defaults)
 */
function request(options) {
  return new RequestObservable(options);
}

request.RequestObservable = RequestObservable;
request.RequestError = RequestError;
request.RequestResponse = RequestResponse;
request.RequestErrorTypes = RequestErrorTypes;

module.exports = request;

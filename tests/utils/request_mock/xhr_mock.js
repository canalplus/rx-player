import useFakeXMLHttpRequest from "./fake_xhr";

/**
 * Mock and lock XHR from being sent.
 * Provide methods to obtain Promise when every locked XMLHttpRequest are
 * finished.
 *
 * @example
 * ```js
 * const xhrMock = new XHRMock();
 *
 * // Mock specific request
 * xhrMock.respondTo(
 *   "GET",
 *   "https://time.akamai.com/?iso",
 *   [ 200, { "Content-Type": "text/plain"}, "2019-03-25T12:49:08.014Z"]
 * );
 * xhrMock.lock(); // lock every request from being sent
 *
 * performRequests();
 *
 * xhrMock.flush().then(() => {
 *   // every requests have finished / been handled
 * });
 * ```
 * @class XHRMock
 */
export default class XHRMock {
  constructor() {
    this.isLocked = false;

    this._rules = [];
    this._sendingQueue = [];

    this._fakeXHR = useFakeXMLHttpRequest();
    const self = this;
    this._fakeXHR._onCreate = (xhr) => {
      function shouldMockRequest(args) {
        if (args.length < 2) {
          return false;
        }

        const [ method, url ] = args;
        if (url === "" || url == null) {
          return false;
        }

        return !!self.__getRuleFor(url, method);
      }
      xhr._shouldMock = (...args) => shouldMockRequest(args);

      /**
       * Contains tuple of all request headers, name and value, passed to the
       * `requestHeadersSet` XHR method.
       */
      const requestHeadersSet = [];

      xhr._onSetRequestHeader = (name, value) => {
        requestHeadersSet.push([name, value]);
      };

      xhr._onSend = (data) => {
        if (!xhr.async) { // We sadly cannot manage those without breaking stuff
          /* eslint-disable-next-line no-console */
          console.warn("XHRMock: A non-async XMLHttpRequest was sent.",
                       "Sending immediately.");

          this.__xhrSend(xhr, data);
        } else if (!this.isLocked) {
          this.__xhrSend(xhr, data);
        } else {
          this._sendingQueue.push({ xhr, data, requestHeadersSet });
        }
      };
    };
  }

  /**
   * Mock response to a given request.
   *
   * @example
   * ```js
   * // with method and URL
   * respond("GET", "http://a.com", [ 200, {
   *   "Content-Type": "text/plain",
   * }, "data" ]);
   *
   * // with only URL == for every methods
   * respond("http://data.org", [ 200, {
   *   "Content-Type": "text/plain",
   * }, new Uint8Array([]) ]);
   * ```
   */
  respondTo(...args) {
    let response, url, method;
    if (args.length === 2) {
      url = args[0];
      response = args[1];
      method = null;
    } else if (args.length === 3) {
      method = args[0];
      url = args[1];
      response = args[2];
    } else {
      throw new Error("XHRMock: wrong number of arguments");
    }
    this._rules.push({ method, url, response });
  }

  /**
   * Returns an array describing the currently locked requests.
   * Each element in this array link to a locked request. They are in
   * chronological order (from the oldest to the newest) and have the following
   * keys:
   *   - ``xhr`` {``Object``} - Corresponding XMLHttpRequest (technically, it is
   *     not an instance of a regular XMLHttpRequest but rather our own
   *     implementation).
   *   - ``method`` (``string``): method used when opening the XMLHttpRequest.
   *   - ``url`` (``string``): URL used when opening the XMLHttpRequest.
   *   - ``requestHeadersSet`` (``Array``): Array containing all request headers
   *     set through the `setRequestHeader` method of that XHR, by chronological
   *     order (from earliest to latest).
   *     For each header set trough this method, you will get a tuple under
   *     the following form `[headerName: string, headerValue: string]`.
   *
   * @returns {Array.<Object>}
   */
  getLockedXHR() {
    return this._sendingQueue.map(req => ({
      xhr: req.xhr,
      requestHeadersSet: req.requestHeadersSet,
      method: req.xhr.method,
      url: req.xhr.url }));
  }

  /**
   * Lock every request from being sent until unlocked
   */
  lock() {
    this.isLocked = true;
  }

  /**
   * Remove the lock and resolve the promise once every locked requests have
   * finished (either aborted, on error or finished succesfully).
   * @returns {Promise}
   */
  unlock() {
    this.isLocked = false;
    return this.flush();
  }

  /**
   * Perform every locked requests and resolve once every one of them have
   * finished (either aborted, on error or finished succesfully).
   * Keep the lock on, if one.
   * @param {number} count
   * @returns {Promise}
   */
  flush(nbrOfRequests) {
    const len = this._sendingQueue.length;
    const proms = [];
    const nbrOfRequestsToFlush = nbrOfRequests !== undefined ?
      Math.min(len, nbrOfRequests) : len;
    const nbrOfRequestThatStays = len - nbrOfRequestsToFlush;
    while (this._sendingQueue.length > nbrOfRequestThatStays) {
      const { xhr, data } = this._sendingQueue.pop();
      this.__xhrSend(xhr, data);
      proms.push(xhr._finished);
    }
    return Promise.all(proms);
  }

  /**
   * Remove side-effect performed by the mock.
   * /!\ The mock will be unusable after that.
   */
  restore() {
    this.flush();
    this._fakeXHR.restore();
  }

  /**
   * Send the request given in args.
   * @private
   * @param {FakeXMLHttpRequest} fakeXhr
   * @param {*} data
   */
  __xhrSend(fakeXhr, data) {
    if (fakeXhr.aborted || fakeXhr.readyState === 4) {
      return;
    }

    const rule = this.__getRuleFor(fakeXhr.url, fakeXhr.method);
    if (!rule) {
      fakeXhr.actuallySend(data);
      return;
    }

    const { response } = rule;
    fakeXhr.respond(response[0], response[1], response[2]);
  }

  /**
   * If the request has been mocked, return the corresponding "rule".
   * Else, return `null`.
   * @private
   * @param {string} url
   * @param {string} method
   * @returns {Object|null}
   */
  __getRuleFor(url, method) {
    const rules = this._rules.slice();
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (rule.url === url) {
        if (rule.method == null || rule.method === method) {
          return rule;
        }
      }
    }
    return null;
  }
}

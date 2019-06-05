const global =
  (typeof self === "object" && self.self === self && self) ||
  (typeof global === "object" && global.global === global && global) ||
  this;

/**
 * Simple util which allows the prevention of new XMLHttpRequests from being
 * sent.
 * TODO This was done quickly for not-so-simple problems.
 * We could probably put more time into it in the future for features like
 * redirects.
 * @returns {Object}
 */
export default function XHRLocker() {
  const globalOpen = global.XMLHttpRequest.prototype.open;
  const globalSend = global.XMLHttpRequest.prototype.send;
  const globalAbort = global.XMLHttpRequest.prototype.abort;

  const redirectRules = {};
  let restored = false;
  let locked = false;
  const waitingRequests = [];
  const openCallsMap = new Map();

  global.XMLHttpRequest.prototype.abort = function(...abortArgs) {
    openCallsMap.delete(this);
    for (let i = waitingRequests.length - 1; i >= 0; i--) {
      if (waitingRequests[i].xhr === this) {
        waitingRequests.splice(i); // Note: is that really what we want?
      }
    }
    globalAbort.apply(this, abortArgs);
  };

  global.XMLHttpRequest.prototype.open = function(...openArgs) {
    const redirectedURL = typeof redirectRules[openArgs[1]] === "string" ?
      redirectRules[openArgs[1]] :
      openArgs[1];
    openCallsMap.set(this, { method: openArgs[0],
                             url: openArgs[1],
                             redirectedURL });
    const newArgs = [...openArgs];
    newArgs[1] = redirectedURL;
    globalOpen.apply(this, newArgs);
  };

  global.XMLHttpRequest.prototype.send = function(...sendArgs)  {
    if (!locked) {
      globalSend.apply(this, sendArgs);
    } else {
      const openArgs = openCallsMap.get(this);
      waitingRequests.push({ xhr: this,
                             sendArgs,
                             method: openArgs &&
                                     openArgs.method,
                             url: openArgs &&
                                  openArgs.url,
                             redirectedURL: openArgs &&
                                            openArgs.redirectedURL });
    }
    openCallsMap.delete(this);
  };

  return {
    /**
     * Prevent the next requests from being sent.
     * Until either `flush` or `unlock` are called.
     */
    lock() {
      if (restored) {
        throw new Error("Cannot call `lock`. This XHRLocker was restored.");
      }
      locked = true;
    },

    /**
     * Returns informations all XMLHttpRequest which are currently locked.
     * @returns {Array.<Object>}
     */
    getLockedXHR() {
      if (restored) {
        throw new Error("Cannot call `getLockedXHR`. This XHRLocker was restored.");
      }
      return waitingRequests.map(req => ({
        xhr: req.xhr,
        url: req.url,
        method: req.method,
      }));
    },

    /**
     * @param {string} url
     * @param {string} newUrl
     */
    redirect(url, newUrl) {
      redirectRules[url] = newUrl;
    },

    /**
     * @param {string} url
     */
    removeRedirect(url) {
      delete redirectRules[url];
    },

    /**
     * Send the XMLHttpRequest which are currently locked.
     * The promise returned will resolve after every locked requests are
     * finished, even if they were on error or aborted.
     * @returns {Promise}
     */
    flush() {
      if (restored) {
        throw new Error("Cannot call `getLockedXHR`. This XHRLocker was restored.");
      }
      const reqs = waitingRequests.slice(0);
      waitingRequests.length = 0;
      return Promise.all(reqs.map((req) => {
        return new Promise(res => {
          const { xhr, sendArgs } = req;
          function onLoadEnd() {
            // probably not needed but heh
            xhr.removeEventListener("loadend", onLoadEnd);
            res();
          }
          xhr.addEventListener("loadend", onLoadEnd);
          globalSend.apply(xhr, sendArgs);
        });
      }));
    },

    /**
     * Send the XMLHttpRequest which are currently locked and re-allow new
     * XMLHttpRequests from being sent.
     */
    unlock() {
      if (restored) {
        throw new Error("Cannot call `unlock`. This XHRLocker was restored.");
      }
      locked = false;
      this.flush();
    },

    /**
     * Remove side-effects performed by the XHRLocker.
     * Important note: it can be problematic to call this function if multiple
     * utils choose to monkey-patch XMLHttpRequest. Always call `restore` at the
     * same time for each related util.
     */
    restore() {
      this.flush();
      global.XMLHttpRequest.prototype.open = globalOpen;
      global.XMLHttpRequest.prototype.send = globalSend;
      global.XMLHttpRequest.prototype.abort = globalAbort;
      openCallsMap.clear();
      restored = true;
    },
  };
}

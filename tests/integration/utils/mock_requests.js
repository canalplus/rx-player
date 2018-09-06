/**
 * Mock manifest request as defined by the mock structure given.
 * @param {Object} fakeServer
 * @param {Object} mock
 */
function mockManifestRequest(fakeServer, mock) {
  fakeServer.respondWith("GET", mock.manifest.url,
    [200, {
      "Content-Type": mock.manifest.contentType,
    }, mock.manifest.data]);
}

/**
 * Mock every requests defined in the mock structure given.
 * @param {Object} fakeServer
 * @param {Object} mock
 */
function mockAllRequests(fakeServer, mock) {
  mockManifestRequest(fakeServer, mock);

  for (const type of Object.keys(mock)) {
    if (type !== "manifest") {
      const contents = mock[type];
      if (contents && contents.length) {
        for (const content of contents) {
          if (content && content.init) {
            if (typeof content.init.data === "function") {
              fakeServer.respondWith("GET", content.init.url, (xhr) => {
                const res = content.init.data();
                xhr.respond(200, {
                  "Content-Type": content.init.contentType,
                }, res);
              });
            } else {
              fakeServer.respondWith("GET", content.init.url,
                [200, {
                  "Content-Type": content.init.contentType,
                }, content.init.data]);
            }
          }
          if (content && content.segments) {
            for (const segment of content.segments) {
              if (typeof segment.data === "function") {
                fakeServer.respondWith("GET", segment.url, (xhr) => {
                  const res = segment.data();
                  xhr.respond(200, {
                    "Content-Type": segment.contentType,
                  }, res);
                });
              } else {
                fakeServer.respondWith("GET", segment.url,
                  [200, {
                    "Content-Type": segment.contentType,
                  }, segment.data]);
              }
            }
          }
        }
      }
    }
  }
}

export {
  mockManifestRequest,
  mockAllRequests,
};

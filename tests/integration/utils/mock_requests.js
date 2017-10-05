
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
            // fakeServer.respondWith("GET", content.init.url, (req) => {
            //   req.respond(200, {
            //     "Content-Type": content.init.contentType,
            //   }, content.init.data);
            // });
            fakeServer.respondWith("GET", content.init.url,
              [200, {
                "Content-Type": content.init.contentType,
              }, content.init.data]);
          }
          if (content && content.segments) {
            for (const segment of content.segments) {
              // fakeServer.respondWith("GET", segment.url, (req) => {
              //   req.respond(200, {
              //     "Content-Type": segment.contentType,
              //   }, segment.data);
              // });
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

/**
 * Mock every content defined in the mock structure given.
 * @param {Object} mock
 * @param {String} url
 */
function getContentFromURL(mock, url) {
  if(mock) {
    for (const type of Object.keys(mock)) {
      if (type !== "manifest") {
        const contents = mock[type];
        if (contents && contents.length) {
          for (const content of contents) {
            if (content && content.init) {
              if(content.init.url === url) {
                return {
                  data: content.init.data,
                  type: content.init.contentType,
                  size: content.init.data.length,
                };
              }
              if (content && content.segments) {
                for (const segment of content.segments) {
                  if (segment.url === url) {
                    return {
                      data: segment.data,
                      type: segment.contentType,
                      size: segment.data.length,
                    };
                  }
                }
              }
            }
          }
        }
      } else {
        const manifest = mock.manifest;
        if (url === manifest.url) {
          return {
            data: manifest.data,
            type: manifest.contentType,
            size: manifest.data.length,
          }
           ;}
      }
    }
    return "";
  }
}

export {
  mockManifestRequest,
  mockAllRequests,
  getContentFromURL,
};

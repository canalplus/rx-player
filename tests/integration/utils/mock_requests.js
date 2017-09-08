function mockManifestRequest(fakeServer, mock) {
  fakeServer.respondWith("GET", mock.manifest.url,
    [200, {
      "Content-Type": mock.manifest.contentType,
    }, mock.manifest.data]);
}

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

export {
  mockManifestRequest,
  mockAllRequests,
};

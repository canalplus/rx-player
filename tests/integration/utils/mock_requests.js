/**
 * Mock a single GET request
 * @param {Object} fakeServer - Sinon's FakeServer instance.
 * @param {Object} urlData - Informations about the URL you want to mock.
 */
function mockRequest(fakeServer, { url, data, contentType }) {
  if (typeof data === "function") {
    fakeServer.respondWith("GET", url, (xhr) => {
      const res = data();
      xhr.respond(200, { "Content-Type": contentType }, res);
    });
  } else {
    fakeServer.respondWith("GET", url,
      [200, { "Content-Type": contentType }, data]);
  }
}

/**
 * Mock every requests defined in the Content structure given.
 * @param {Object} fakeServer - Sinon's FakeServer instance.
 * @param {Array.<Object>} urlData
 */
export default function mockAllRequests(fakeServer, urlData) {
  for (const media of urlData) {
    mockRequest(fakeServer, media);
  }
}

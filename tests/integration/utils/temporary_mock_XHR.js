/*
* Temporary mock of XMLHttpRequest.
* Used awaiting sinonjs support for arraybuffer responses.
*
* @param {function} GetContent
* @param {Object} Mock
*/
export default function TemporaryXHRMock(Mock) {

  const origXHR = window.XMLHttpRequest;
  const mock = Mock;

  /**
   * Mock every content defined in the mock structure given.
   * @param {Object} mock
   * @param {String} url
   */
  function getContent(mock, url) {
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

  /*
  * Define fake XMLHttpRequest and mock original.
  */
  TemporaryXHRMock.prototype.start = function() {

    const isXMLContentType = function(contentType) {
      return !contentType || /(text\/xml)|(application\/xml)|(\+xml)/.test(contentType);
    };

    const fakeRequest = function() {
      this.url = "";
      this.timeout = 0;
      this.responseType = "";
      this.readyState = 0;
      this.status = undefined;
      this.responseURL = "";
      this.responseText = "";
      this.response = undefined;
    };

    fakeRequest.prototype = {
      overrideMimeType: function(){
        this.responseType = arguments;
      },
      setRequestHeader: function(){
        return;
      },
      open: function(method, url, isSync){
        this.url = url;
        return;
      },
      send: function(){
        const content = getContent(mock, this.url);
        if (this.url.length && content) {
          this.responseType = isXMLContentType(content.type) ? "document" : "arraybuffer";
          this.readyState = 4;
          this.status = 200;
          this.responseURL = this.url;
          this.response = this.responseType == "document" ? new DOMParser().parseFromString(content.data, "text/xml") : content.data;
          this.onload({total: content.size});
          return;
        }
      },
      abort: function(){
        return;
      },
      onload: new Event("load"),
      onprogress: new Event("progress"),
      onerror: new Event("error"),
    };

    window.XMLHttpRequest = fakeRequest;
  };

  /*
  * Restore XML
  */
  TemporaryXHRMock.prototype.restore =  function() {
    window.XMLHttpRequest = origXHR;
  };
}

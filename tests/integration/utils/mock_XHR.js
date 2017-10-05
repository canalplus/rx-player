import parseXML from "./parseXML.js"

/*
* Partial mock of XMLHttpRequest
* @param {function} GetContent
* @param {Object} Mock
*/
export default function mockXHR(GetContent, Mock) {

  const origXHR = window.XMLHttpRequest;
  const getContent = GetContent;
  const mock = Mock;

  /*
  * Define fake XMLHttpRequest and mock original.
  */
  mockXHR.prototype.startMock = function() {

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
          this.response = this.responseType == "document" ? parseXML(content.data) : content.data;
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
  mockXHR.prototype.restoreMock =  function() {
    window.XMLHttpRequest = origXHR;
  };
}

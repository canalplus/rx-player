import Mock from "../mocks/dash_static_SegmentTimeline.js";

/*
* Partial mock of XMLHttpRequest
* @param {function} getContent: provides HTTP responses depending on URL
*/

const XHRmock = {
  origXHR: window.XMLHttpRequest,
  startXHRmock: start,
  restoreXHRmock: restore,
};

function start(getContent) {

  const fakeRequest = function() {
    this.url = "";
    this.timeout = 30 * 1000;
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
      const content = getContent(Mock, this.url);
      if (this.url.length && content) {
        this.response = content.data;
        this.responseType = content.type;
        this.readyState = 4;
        this.status = 200;
        this.responseURL = this.url;
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

}

function restore() {
  window.XMLHttpRequest = this.origXHR;
}

export { XHRmock };

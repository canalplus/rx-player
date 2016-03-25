var schemeRe = /^(?:[a-z]+:)?\/\//i;
var selfDirRe = /\/[\.]{1,2}\//;

function _normalizeUrl(url) {
  // fast path if no ./ or ../ are present in the url
  if (!selfDirRe.test(url)) {
    return url;
  }

  var newUrl = [];
  var oldUrl = url.split("/");
  for (var i = 0, l = oldUrl.length; i < l; i++) {
    if (oldUrl[i] == "..") {
      newUrl.pop();
    } else if (oldUrl[i] == ".") {
      continue;
    } else {
      newUrl.push(oldUrl[i]);
    }
  }

  return newUrl.join("/");
}

function resolveURL() {
  var len = arguments.length;
  if (len === 0)
    return "";

  var base = "";
  for (var i = 0; i < len; i++) {
    var part = arguments[i];
    if (typeof part !== "string" || part === "") {
      continue;
    }
    if (schemeRe.test(part)) {
      base = part;
    }
    else {
      if (part[0] === "/") {
        part = part.substr(1);
      }

      if (base[base.length - 1] === "/") {
        base = base.substr(0, base.length - 1);
      }

      base = base + "/" + part;
    }
  }

  return _normalizeUrl(base);
}

function parseBaseURL(url) {
  var slash = url.lastIndexOf("/");
  if (slash >= 0) {
    return url.substring(0, slash + 1);
  } else {
    return url;
  }
}

module.exports = {
  resolveURL,
  parseBaseURL,
};

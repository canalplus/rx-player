function listToMap(list) {
  const map = list.reduce((map, name) => {
    map[name] = name;
    return map;
  }, {});

  map.keys = list;
  return map;
}

const ErrorTypes = listToMap([
  "NETWORK_ERROR",
  "MEDIA_ERROR",
  "ENCRYPTED_MEDIA_ERROR",
  "INDEX_ERROR",
  "OTHER_ERROR",
]);

const RequestErrorTypes = listToMap([
  "TIMEOUT",
  "ERROR_EVENT",
  "ERROR_HTTP_CODE",
  "PARSE_ERROR",
]);

const ErrorCodes = listToMap([
  "PIPELINE_RESOLVE_ERROR",
  "PIPELINE_LOAD_ERROR",
  "PIPELINE_PARSING_ERROR",

  "MANIFEST_PARSE_ERROR",
  "MANIFEST_INCOMPATIBLE_CODECS_ERROR",

  "MEDIA_IS_ENCRYPTED_ERROR",

  "KEY_ERROR",
  "KEY_STATUS_CHANGE_ERROR",
  "KEY_UPDATE_ERROR",
  "KEY_LOAD_ERROR",
  "KEY_LOAD_TIMEOUT",
  "KEY_GENERATE_REQUEST_ERROR",
  "INCOMPATIBLE_KEYSYSTEMS",

  "BUFFER_APPEND_ERROR",
  "BUFFER_FULL_ERROR",
  "BUFFER_TYPE_UNKNOWN",

  "MEDIA_ERR_ABORTED",
  "MEDIA_ERR_NETWORK",
  "MEDIA_ERR_DECODE",
  "MEDIA_ERR_SRC_NOT_SUPPORTED",

  "MEDIA_SOURCE_NOT_SUPPORTED",
  "MEDIA_KEYS_NOT_SUPPORTED",

  "OUT_OF_INDEX_ERROR",
  "UNKNOWN_INDEX",
]);

function errorMessage(name, code, reason) {
  return `${name}(${code})${reason ? ": " + reason.message : ""}`;
}

function MediaError(code, reason, fatal) {
  this.name = "MediaError";
  this.type = ErrorTypes.MEDIA_ERROR;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, this.reason);
}
MediaError.prototype = new Error();

function NetworkError(code, reason, fatal) {
  this.name = "NetworkError";
  this.type = ErrorTypes.NETWORK_ERROR;

  this.xhr = reason.xhr;
  this.url = reason.url;
  this.status = reason.status;
  this.reqType = reason.type;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  if (this.reason) {
    this.message = errorMessage(this.name, this.code, this.reason);
  } else {
    const reasonMessage = `${this.reqType}${this.status > 0 ? `(${this.status})` : ""} on ${this.url}`;
    this.message = errorMessage(this.name, this.code, { message: reasonMessage });
  }
}
NetworkError.prototype = new Error();

NetworkError.prototype.isHttpError = function(httpErrorCode) {
  return (
    this.reqType == RequestErrorTypes.ERROR_HTTP_CODE &&
    this.status == httpErrorCode
  );
};

function EncryptedMediaError(code, reason, fatal) {
  this.name = "EncryptedMediaError";
  this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, this.reason);
}
EncryptedMediaError.prototype = new Error();

function IndexError(code, indexType, fatal) {
  this.name = "IndexError";
  this.type = ErrorTypes.INDEX_ERROR;

  this.indexType = indexType;

  this.reason = null;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, null);
}
IndexError.prototype = new Error();

function OtherError(code, reason, fatal) {
  this.name = "OtherError";
  this.type = ErrorTypes.OTHER_ERROR;

  this.reason = reason;
  this.code = ErrorCodes[code];
  this.fatal = fatal;
  this.message = errorMessage(this.name, this.code, this.reason);
}
OtherError.prototype = new Error();

function RequestError(xhr, request, type) {
  this.name = "RequestError";
  this.url = request.url;
  this.xhr = xhr;
  this.status = xhr.status;
  this.type = type;
  this.message = type;
}
RequestError.prototype = new Error();

function isKnownError(error) {
  return (!!error && !!error.type && ErrorTypes.keys.indexOf(error.type) >= 0);
}

module.exports = {
  ErrorTypes,
  ErrorCodes,

  MediaError,
  NetworkError,
  EncryptedMediaError,
  IndexError,
  OtherError,

  RequestError,
  RequestErrorTypes,
  isKnownError,
};

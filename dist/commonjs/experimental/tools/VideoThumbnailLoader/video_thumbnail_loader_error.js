"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Returned error when rejecting
var VideoThumbnailLoaderError = /** @class */ (function (_super) {
    __extends(VideoThumbnailLoaderError, _super);
    /**
     * @param {string} code
     * @param {string} message
     */
    function VideoThumbnailLoaderError(code, message) {
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, VideoThumbnailLoaderError.prototype);
        _this.name = "VideoThumbnailLoaderError";
        _this.code = code;
        _this.message = message;
        return _this;
    }
    return VideoThumbnailLoaderError;
}(Error));
exports.default = VideoThumbnailLoaderError;

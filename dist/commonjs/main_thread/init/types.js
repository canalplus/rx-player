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
exports.ContentInitializer = void 0;
var event_emitter_1 = require("../../utils/event_emitter");
/**
 * Class allowing to start playing a content on an `HTMLMediaElement`.
 *
 * The actual constructor arguments depend on the `ContentInitializer` defined,
 * but should reflect all potential configuration wanted relative to this
 * content's playback.
 *
 * Various events may be emitted by a `ContentInitializer`. However, no event
 * should be emitted before `prepare` or `start` is called and no event should
 * be emitted after `dispose` is called.
 */
var ContentInitializer = /** @class */ (function (_super) {
    __extends(ContentInitializer, _super);
    function ContentInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ContentInitializer;
}(event_emitter_1.default));
exports.ContentInitializer = ContentInitializer;

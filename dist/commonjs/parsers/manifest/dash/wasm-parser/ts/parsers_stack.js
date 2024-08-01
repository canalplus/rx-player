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
Object.defineProperty(exports, "__esModule", { value: true });
var noop_1 = require("../../../../../utils/noop");
/**
 * Maintains a stack of children and attributes parsers, to easily parse
 * the very hierarchical MPDs.
 *
 * This class allows to easily push and pop such parsers once nodes are
 * respectively opened and closed.
 *
 * @class ParsersStack
 */
var ParsersStack = /** @class */ (function () {
    function ParsersStack() {
        this._currentNodeId = null;
        this.childrenParser = noop_1.default;
        this.attributeParser = noop_1.default;
        this._stack = [{ nodeId: null, children: noop_1.default, attribute: noop_1.default }];
    }
    ParsersStack.prototype.pushParsers = function (nodeId, childrenParser, attrParser) {
        this._currentNodeId = nodeId;
        this.childrenParser = childrenParser;
        this.attributeParser = attrParser;
        this._stack.push({
            nodeId: nodeId,
            attribute: attrParser,
            children: childrenParser,
        });
    };
    ParsersStack.prototype.popIfCurrent = function (idToPop) {
        if (this._currentNodeId !== idToPop) {
            return;
        }
        this._stack.pop();
        var _a = this._stack[this._stack.length - 1], nodeId = _a.nodeId, children = _a.children, attribute = _a.attribute;
        this._currentNodeId = nodeId;
        this.attributeParser = attribute;
        this.childrenParser = children;
    };
    ParsersStack.prototype.reset = function () {
        this.childrenParser = noop_1.default;
        this.attributeParser = noop_1.default;
        this._stack = [{ nodeId: null, children: noop_1.default, attribute: noop_1.default }];
    };
    return ParsersStack;
}());
exports.default = ParsersStack;

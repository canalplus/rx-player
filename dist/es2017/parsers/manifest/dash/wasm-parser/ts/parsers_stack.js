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
import noop from "../../../../../utils/noop";
/**
 * Maintains a stack of children and attributes parsers, to easily parse
 * the very hierarchical MPDs.
 *
 * This class allows to easily push and pop such parsers once nodes are
 * respectively opened and closed.
 *
 * @class ParsersStack
 */
export default class ParsersStack {
    constructor() {
        this._currentNodeId = null;
        this.childrenParser = noop;
        this.attributeParser = noop;
        this._stack = [{ nodeId: null, children: noop, attribute: noop }];
    }
    pushParsers(nodeId, childrenParser, attrParser) {
        this._currentNodeId = nodeId;
        this.childrenParser = childrenParser;
        this.attributeParser = attrParser;
        this._stack.push({
            nodeId,
            attribute: attrParser,
            children: childrenParser,
        });
    }
    popIfCurrent(idToPop) {
        if (this._currentNodeId !== idToPop) {
            return;
        }
        this._stack.pop();
        const { nodeId, children, attribute } = this._stack[this._stack.length - 1];
        this._currentNodeId = nodeId;
        this.attributeParser = attribute;
        this.childrenParser = children;
    }
    reset() {
        this.childrenParser = noop;
        this.attributeParser = noop;
        this._stack = [{ nodeId: null, children: noop, attribute: noop }];
    }
}

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
/** Type of the function called when a Node opening is encountered. */
export type IChildrenParser = (node: number) => void;
/** Type of the function called when an attribute is encountered. */
export type IAttributeParser = (attr: number, ptr: number, len: number) => void;
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
    private _currentNodeId;
    childrenParser: IChildrenParser;
    attributeParser: IAttributeParser;
    private _stack;
    constructor();
    pushParsers(nodeId: number | null, childrenParser: IChildrenParser, attrParser: IAttributeParser): void;
    popIfCurrent(idToPop: number): void;
    reset(): void;
}

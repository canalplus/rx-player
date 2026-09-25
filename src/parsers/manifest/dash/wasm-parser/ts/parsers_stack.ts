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

import noop from "../../../../../utils/noop.ts";

/** Type of the function called when a Node opening is encountered. */
export type IChildrenParser = (node: number) => void;

/** Type of the function called when an attribute is encountered. */
export type IAttributeParser = (attr: number, ptr: number, len: number) => void;

/** Attribute parser which receives its changing target separately. */
export type IStaticAttributeParser = (
  target: object,
  linearMemory: WebAssembly.Memory,
  attr: number,
  ptr: number,
  len: number,
) => void;

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
  private _currentNodeId: number | null;
  public childrenParser: IChildrenParser;
  public attributeParser: IAttributeParser;

  private _staticAttributeParser: IStaticAttributeParser | null;
  private _attributeTarget: object | null;
  private _linearMemory: WebAssembly.Memory | null;

  private _stack: Array<{
    nodeId: number | null;
    attribute: IAttributeParser;
    children: IChildrenParser;
    staticAttribute: IStaticAttributeParser | null;
    attributeTarget: object | null;
    linearMemory: WebAssembly.Memory | null;
  }>;
  constructor() {
    this._currentNodeId = null;
    this.childrenParser = noop;
    this.attributeParser = noop;
    this._staticAttributeParser = null;
    this._attributeTarget = null;
    this._linearMemory = null;
    this._stack = [
      {
        nodeId: null,
        children: noop,
        attribute: noop,
        staticAttribute: null,
        attributeTarget: null,
        linearMemory: null,
      },
    ];
  }

  public pushParsers(
    nodeId: number | null,
    childrenParser: IChildrenParser,
    attrParser: IAttributeParser,
  ): void {
    this._currentNodeId = nodeId;
    this.childrenParser = childrenParser;
    this.attributeParser = attrParser;
    this._staticAttributeParser = null;
    this._attributeTarget = null;
    this._linearMemory = null;
    this._stack.push({
      nodeId,
      attribute: attrParser,
      children: childrenParser,
      staticAttribute: null,
      attributeTarget: null,
      linearMemory: null,
    });
  }

  public pushParsersWithStaticAttribute(
    nodeId: number,
    childrenParser: IChildrenParser,
    attrParser: IStaticAttributeParser,
    attributeTarget: object,
    linearMemory: WebAssembly.Memory,
  ): void {
    this._currentNodeId = nodeId;
    this.childrenParser = childrenParser;
    this.attributeParser = noop;
    this._staticAttributeParser = attrParser;
    this._attributeTarget = attributeTarget;
    this._linearMemory = linearMemory;
    this._stack.push({
      nodeId,
      attribute: noop,
      children: childrenParser,
      staticAttribute: attrParser,
      attributeTarget,
      linearMemory,
    });
  }

  public parseAttribute(attr: number, ptr: number, len: number): void {
    if (
      this._staticAttributeParser !== null &&
      this._attributeTarget !== null &&
      this._linearMemory !== null
    ) {
      this._staticAttributeParser(
        this._attributeTarget,
        this._linearMemory,
        attr,
        ptr,
        len,
      );
    } else {
      this.attributeParser(attr, ptr, len);
    }
  }

  public popIfCurrent(idToPop: number): void {
    if (this._currentNodeId !== idToPop) {
      return;
    }
    this._stack.pop();
    const {
      nodeId,
      children,
      attribute,
      staticAttribute,
      attributeTarget,
      linearMemory,
    } = this._stack[this._stack.length - 1];
    this._currentNodeId = nodeId;
    this.attributeParser = attribute;
    this.childrenParser = children;
    this._staticAttributeParser = staticAttribute;
    this._attributeTarget = attributeTarget;
    this._linearMemory = linearMemory;
  }

  public reset(): void {
    this.childrenParser = noop;
    this.attributeParser = noop;
    this._staticAttributeParser = null;
    this._attributeTarget = null;
    this._linearMemory = null;
    this._stack = [
      {
        nodeId: null,
        children: noop,
        attribute: noop,
        staticAttribute: null,
        attributeTarget: null,
        linearMemory: null,
      },
    ];
  }
}

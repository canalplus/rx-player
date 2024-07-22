/**
 * This code is mainly a modified version of the tXml library.
 *
 * @author: Tobias Nickel
 * created: 06.04.2015
 * https://github.com/TobiasNickel/tXml
 */

// import arrayIncludes from "./array_includes";

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Tobias Nickel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export interface ITNode {
  tagName: string;
  attributes: Partial<Record<string, string | null>>;
  children: Array<ITNode | string>;
  posStart: number;
  posEnd: number;
}

export interface ITParseOptions {
  pos?: number;
  noChildNodes?: string[];
  keepComments?: boolean;
  keepWhitespace?: boolean;
  simplify?: boolean;
  filter?: (a: ITNode, i: number) => boolean;
  attrName?: string;
  attrValue?: string;
}

const openBracket = "<";
const openBracketCC = "<".charCodeAt(0);
const closeBracket = ">";
const closeBracketCC = ">".charCodeAt(0);
const minusCC = "-".charCodeAt(0);
const slashCC = "/".charCodeAt(0);
const exclamationCC = "!".charCodeAt(0);
const singleQuoteCC = "'".charCodeAt(0);
const doubleQuoteCC = '"'.charCodeAt(0);
const openCornerBracketCC = "[".charCodeAt(0);
const closeCornerBracketCC = "]".charCodeAt(0);
/** Character marking end of attribute and node name. */
const nameSpacer = "\r\n\t>/= ";

/**
 * parseXML / html into a DOM Object. with no validation and some failur tolerance
 * @param {string} src - Your XML to parse
 * @param {Object} [options = {}] -  all other options:
 * @return {Array.<Object | string>}
 */
function parseXml(src: string, options: ITParseOptions = {}): Array<ITNode | string> {
  let pos = options.pos ?? 0;
  const keepComments = options.keepComments === true;
  const keepWhitespace = options.keepWhitespace === true;

  let out: Array<ITNode | string>;
  if (options.attrValue !== undefined) {
    options.attrName = options.attrName ?? "id";
    out = [];

    while ((pos = findElements()) !== -1) {
      pos = src.lastIndexOf("<", pos);
      if (pos !== -1) {
        out.push(parseNode());
      }
      // eslint-disable-next-line no-param-reassign
      src = src.substring(pos);
      pos = 0;
    }
  } else {
    out = parseChildren("");
  }

  if (options.filter) {
    out = filter(out, options.filter);
  }
  return out;

  /**
   * parsing a list of entries
   * @param {string} tagName
   * @returns {Array.<ITNode | string>}
   */
  function parseChildren(tagName: string): Array<ITNode | string> {
    const children: Array<ITNode | string> = [];
    while (src[pos]) {
      if (src.charCodeAt(pos) === openBracketCC) {
        if (src.charCodeAt(pos + 1) === slashCC) {
          const closeStart = pos + 2;
          pos = src.indexOf(closeBracket, pos);

          const closeTag = src.substring(closeStart, pos);
          if (closeTag.indexOf(tagName) === -1) {
            const parsedText = src.substring(0, pos).split("\n");
            throw new Error(
              "Unexpected close tag\nLine: " +
                (parsedText.length - 1) +
                "\nColumn: " +
                (parsedText[parsedText.length - 1].length + 1) +
                "\nChar: " +
                src[pos],
            );
          }

          if (pos !== -1) {
            pos += 1;
          }

          return children;
        } else if (src.charCodeAt(pos + 1) === exclamationCC) {
          if (src.charCodeAt(pos + 2) === minusCC) {
            // comment support
            const startCommentPos = pos;
            while (
              pos !== -1 &&
              !(
                src.charCodeAt(pos) === closeBracketCC &&
                src.charCodeAt(pos - 1) === minusCC &&
                src.charCodeAt(pos - 2) === minusCC
              )
            ) {
              pos = src.indexOf(closeBracket, pos + 1);
            }
            if (pos === -1) {
              pos = src.length;
            }
            if (keepComments) {
              children.push(src.substring(startCommentPos, pos + 1));
            }
          } else if (
            src.charCodeAt(pos + 2) === openCornerBracketCC &&
            src.charCodeAt(pos + 8) === openCornerBracketCC &&
            src.substring(pos + 3, pos + 8).toLowerCase() === "cdata"
          ) {
            // cdata
            const cdataEndIndex = src.indexOf("]]>", pos);
            if (cdataEndIndex === -1) {
              children.push(src.substring(pos + 9));
              pos = src.length;
            } else {
              children.push(src.substring(pos + 9, cdataEndIndex));
              pos = cdataEndIndex + 3;
            }
            continue;
          } else {
            // doctypesupport
            const startDoctype = pos + 1;
            pos += 2;
            let encapsuled = false;
            while ((src.charCodeAt(pos) !== closeBracketCC || encapsuled) && src[pos]) {
              if (src.charCodeAt(pos) === openCornerBracketCC) {
                encapsuled = true;
              } else if (encapsuled && src.charCodeAt(pos) === closeCornerBracketCC) {
                encapsuled = false;
              }
              pos++;
            }
            children.push(src.substring(startDoctype, pos));
          }
          pos++;
          continue;
        }
        const node = parseNode();
        children.push(node);
        if (node.tagName[0] === "?") {
          children.push(...node.children);
          node.children = [];
        }
      } else {
        const text = parseText();
        if (keepWhitespace) {
          if (text.length > 0) {
            children.push(text);
          }
        } else {
          const trimmed = text.trim();
          if (trimmed.length > 0) {
            children.push(trimmed);
          }
        }
        pos++;
      }
    }
    return children;
  }

  /**
   *    returns the text outside of texts until the first '<'
   */
  function parseText(): string {
    const start = pos;
    pos = src.indexOf(openBracket, pos) - 1;
    if (pos === -2) {
      pos = src.length;
    }
    return src.slice(start, pos + 1);
  }

  function parseName(): string {
    const start = pos;
    while (nameSpacer.indexOf(src[pos]) === -1 && src[pos]) {
      pos++;
    }
    return src.slice(start, pos);
  }

  function parseNode(): ITNode {
    const posStart = pos;
    pos++;
    const tagName = parseName();
    const attributes: Partial<Record<string, string | null>> = {};
    let children: Array<ITNode | string> = [];

    // parsing attributes
    while (src.charCodeAt(pos) !== closeBracketCC && src[pos]) {
      const c = src.charCodeAt(pos);
      if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
        // if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(src[pos])!==-1 ){
        const name = parseName();
        // search beginning of the string
        let code = src.charCodeAt(pos);
        while (
          code &&
          code !== singleQuoteCC &&
          code !== doubleQuoteCC &&
          !((code > 64 && code < 91) || (code > 96 && code < 123)) &&
          code !== closeBracketCC
        ) {
          pos++;
          code = src.charCodeAt(pos);
        }
        let value;
        if (code === singleQuoteCC || code === doubleQuoteCC) {
          value = parseString();
        } else {
          value = null;
          pos--;
        }
        attributes[name] = value === null ? null : translateEntities(value);
      }
      pos++;
    }
    // optional parsing of children
    if (src.charCodeAt(pos - 1) !== slashCC) {
      pos++;
      children = parseChildren(tagName);
    } else {
      pos++;
    }
    return {
      tagName,
      attributes,
      children,
      posStart,
      posEnd: pos,
    };
  }

  /**
   * Parses a string, that starts with a char and with the same usually ' or "
   * character starting at `pos`.
   * @returns {string}
   */
  function parseString(): string {
    const startChar = src[pos];
    const startpos = pos + 1;
    pos = src.indexOf(startChar, startpos);
    return src.slice(startpos, pos);
  }

  /**
   *
   */
  function findElements(): number {
    const r = new RegExp(
      "\\s" + options.attrName + "\\s*=['\"]" + options.attrValue + "['\"]",
    ).exec(src);
    if (r) {
      return r.index;
    } else {
      return -1;
    }
  }
}

/**
 * behaves the same way as Array.filter, if the filter method return true, the element is in the resultList
 * @params {Array} children - the children of a node
 * @param {function} f - the filter method
 */
function filter(
  children: Array<ITNode | string>,
  f: (a: ITNode, i: number, dept: number, path: string) => boolean,
  dept: number = 0,
  path: string = "",
): Array<ITNode | string> {
  let out: Array<ITNode | string> = [];
  children.forEach(function (child: ITNode | string, i: number) {
    if (typeof child === "object") {
      if (f(child, i, dept, path)) {
        out.push(child);
      }
      if (child.children.length > 0) {
        const kids = filter(
          child.children,
          f,
          dept + 1,
          (path ? path + "." : "") + i + "." + child.tagName,
        );
        out = out.concat(kids);
      }
    }
  });
  return out;
}

/**
 * use this method to read the text content, of some node.
 * It is great if you have mixed content like:
 * this text has some <b>big</b> text and a <a href=''>link</a>
 * @return {string}
 */
function toContentString(tDom: ITNode | string | Array<ITNode | string>): string {
  if (Array.isArray(tDom)) {
    let out = "";
    tDom.forEach(function (e) {
      out += " " + toContentString(e);
      out = out.trim();
    });
    return out;
  } else if (typeof tDom === "object") {
    return toContentString(tDom.children);
  } else {
    return " " + translateEntities(tDom);
  }
}

/**
 * @param {string} str
 * @returns {string}
 */
function translateEntities(str: string): string {
  if (str.indexOf("&") < 0) {
    // Fast path for when there's no entity
    return str;
  }
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([A-Fa-f0-9]+);/g, (_, code: string) => {
      return String.fromCharCode(parseInt(code, 16));
    })
    .replace(/&amp;/g, "&");
}

function findXmlElementByName(
  rootNode: ITNode | string | Array<ITNode | string>,
  name: string,
): ITNode | null {
  if (Array.isArray(rootNode)) {
    for (const subNode of rootNode) {
      const res = findXmlElementByName(subNode, name);
      if (res !== null) {
        return res;
      }
    }
  } else if (typeof rootNode !== "string") {
    if (rootNode.tagName === name) {
      return rootNode;
    }
    for (const child of rootNode.children) {
      const res = findXmlElementByName(child, name);
      if (res !== null) {
        return res;
      }
    }
  }
  return null;
}

function getElementById(src: string, id: string): ITNode | string | undefined {
  const out = parseXml(src, {
    attrValue: id,
  });
  return out[0];
}

function getElementsByClassName(src: string, classname: string): Array<ITNode | string> {
  const out = parseXml(src, {
    attrName: "class",
    attrValue: "[a-zA-Z0-9- ]*" + classname + "[a-zA-Z0-9- ]*",
  });
  return out;
}

export {
  filter,
  getElementById,
  getElementsByClassName,
  parseXml,
  toContentString,
  findXmlElementByName,
};

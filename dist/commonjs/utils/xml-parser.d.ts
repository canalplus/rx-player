/**
 * This code is mainly a modified version of the tXml library.
 *
 * @author: Tobias Nickel
 * created: 06.04.2015
 * https://github.com/TobiasNickel/tXml
 */
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
/**
 * parseXML / html into a DOM Object. with no validation and some failur tolerance
 * @param {string} src - Your XML to parse
 * @param {Object} [options = {}] -  all other options:
 * @return {Array.<Object | string>}
 */
declare function parseXml(src: string, options?: ITParseOptions): Array<ITNode | string>;
/**
 * behaves the same way as Array.filter, if the filter method return true, the element is in the resultList
 * @params {Array} children - the children of a node
 * @param {function} f - the filter method
 */
declare function filter(children: Array<ITNode | string>, f: (a: ITNode, i: number, dept: number, path: string) => boolean, dept?: number, path?: string): Array<ITNode | string>;
/**
 * use this method to read the text content, of some node.
 * It is great if you have mixed content like:
 * this text has some <b>big</b> text and a <a href=''>link</a>
 * @return {string}
 */
declare function toContentString(tDom: ITNode | string | Array<ITNode | string>): string;
declare function getElementById(src: string, id: string): ITNode | string | undefined;
declare function getElementsByClassName(src: string, classname: string): Array<ITNode | string>;
export { filter, getElementById, getElementsByClassName, parseXml, toContentString };

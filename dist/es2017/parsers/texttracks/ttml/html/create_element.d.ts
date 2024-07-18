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
import type { IStyleList, IStyleObject } from "../get_styling";
/**
 * @param {Element} paragraph
 * @param {Element} body
 * @param {Array.<Object>} regions
 * @param {Array.<Object>} styles
 * @param {Object} paragraphStyle
 * @param {Object}
 * @returns {HTMLElement}
 */
export default function createElement(paragraph: Element, body: Element | null, regions: IStyleObject[], styles: IStyleObject[], paragraphStyle: IStyleList, { cellResolution, shouldTrimWhiteSpace, }: {
    shouldTrimWhiteSpace: boolean;
    cellResolution: {
        columns: number;
        rows: number;
    };
}): HTMLElement;
//# sourceMappingURL=create_element.d.ts.map
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

// Parse SRT subtitles into HTML.

// Done for fun. Understand <b>, <i>, <u> and <font color="#ff0000" /> type
// of tags.

import parseTimestamp from "./parseTimestamp";

export interface ISRTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
}

/**
 * @param {string} srtStr
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
export default function parseSRTStringToHTML(
  srtStr : string,
  timeOffset : number
) : ISRTHTMLCue[] {
  // Even if srt only authorize CRLF, we will also take LF or CR as line
  // terminators for resilience
  const lines = srtStr.split(/\r\n|\n|\r/);

  const cueBlocks : string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      const startingI = i;
      i++;

      while (lines[i]) {
        i++;
      }
      cueBlocks.push(lines.slice(startingI, i));
    }
  }

  const cues : ISRTHTMLCue[] = [];
  for (let i = 0; i < cueBlocks.length; i++) {
    const cue = parseCue(cueBlocks[i], timeOffset);
    if (cue) {
      cues.push(cue);
    }
  }

  return cues;
}

/**
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {Object|null}
 */
function parseCue(
  cueLines : string[],
  timeOffset : number
) : ISRTHTMLCue|null {
  const [startString, endString] = cueLines[1].split(" --> ");
  const payloadLines = cueLines.slice(2, cueLines.length);
  if (!startString || !endString || !payloadLines.length) {
    return null;
  }

  const start = parseTimestamp(startString);
  const end = parseTimestamp(endString);

  if (start == null || end == null) {
    return null;
  }

  const pEl = document.createElement("div");
  pEl.className = "rxp-texttrack-p";
  pEl.style.fontSize = "28px";
  pEl.style.position = "absolute";
  pEl.style.bottom = "5%";
  pEl.style.width = "100%";
  pEl.style.textAlign = "center";
  pEl.style.color = "#fff";
  pEl.style.textShadow = "-1px -1px 2px #000," +
    "1px -1px 2px #000," +
    "-1px 1px 2px #000," +
    "1px 1px 2px #000";

  for (let i = 0; i < payloadLines.length; i++) {
    if (i) {
      pEl.appendChild(document.createElement("br"));
    }
    const span = generateSpansFromSRTText(payloadLines[i]);
    pEl.appendChild(span);
  }

  return {
    start: start + timeOffset,
    end: end + timeOffset,
    element: pEl,
  };
}

/**
 * Take a single srt line and convert it into a span with the right style while
 * avoiding XSS.
 * What we do is set a whitelist of authorized tags, and recreate the
 * corresponding tag from scratch.
 * Supported tags:
 *   - <b>: make content bold
 *   - <i>: make content italic
 *   - <u>: draw underline on content
 *   - <font color="x">: add color x to the content
 * @param {string} text
 * @returns {HTMLElement}
 */
function generateSpansFromSRTText(text : string) : HTMLElement {
  const secureDiv = document.createElement("div");
  secureDiv.innerHTML = text;

  const _loop = function(node : Node) : HTMLElement {
    const childNodes = node.childNodes;
    const span = document.createElement("span");
    span.className = "rxp-texttrack-span";

    for (let i = 0; i < childNodes.length; i++) {
      const currentNode = childNodes[i];
      if (currentNode.nodeName === "#text") {
        span.innerHTML += currentNode.textContent;
      } else if (currentNode.nodeName === "B") {
        const spanChild = _loop(currentNode);
        spanChild.style.fontWeight = "bold";
        span.appendChild(spanChild);
      } else if (currentNode.nodeName === "I" ) {
        const spanChild = _loop(currentNode);
        spanChild.style.fontStyle = "italic";
        span.appendChild(spanChild);
      } else if (currentNode.nodeName === "U" ) {
        const spanChild = _loop(currentNode);
        spanChild.style.textDecoration = "underline";
        span.appendChild(spanChild);
      } else if (
        currentNode.nodeName === "FONT" &&
        (currentNode as any).color != null
      ) {
        // TODO loop through attributes to find color?
        const spanChild = _loop(currentNode);
        spanChild.style.color = (currentNode as any).color;
        span.appendChild(spanChild);
      } else {
        const spanChild = _loop(currentNode);
        span.appendChild(spanChild);
      }
    }
    return span;
  };

  return _loop(secureDiv);
}

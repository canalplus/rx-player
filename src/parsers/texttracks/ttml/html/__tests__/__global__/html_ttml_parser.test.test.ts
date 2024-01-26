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

import parseTTMLToDiv from "../../";
import globalScope from "../../../../../../utils/global_scope";

const testingText = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head>
    <metadata xmlns:ttm="http://www.w3.org/ns/ttml#metadata">
      <ttm:title>Timed Text TTML Example</ttm:title>
      <ttm:copyright>The Authors (c) 2006</ttm:copyright>
    </metadata>
    <styling xmlns:tts="http://www.w3.org/ns/ttml#styling">
      <!-- s1 specifies default color, font, and text alignment -->
      <style xml:id="s1"
        tts:color="white"
        tts:fontFamily="proportionalSansSerif"
        tts:fontSize="22px"
        tts:textAlign="center"
      />
      <!-- alternative using yellow text but otherwise the same as style s1 -->
      <style xml:id="s2" style="s1" tts:color="yellow"/>
      <!-- a style based on s1 but justified to the right -->
      <style xml:id="s1Right" style="s1" tts:textAlign="end" />
      <!-- a style based on s2 but justified to the left -->
      <style xml:id="s2Left" style="s2" tts:textAlign="start" />
    </styling>
    <layout xmlns:tts="http://www.w3.org/ns/ttml#styling">
      <region xml:id="subtitleArea"
        style="s1"
        tts:extent="560px 62px"
        tts:padding="5px 3px"
        tts:backgroundColor="black"
        tts:displayAlign="after"
      />
    </layout>
  </head>
  <body region="subtitleArea">
    <div>
      <p xml:id="subtitle1" begin="0.76s" end="3.45s">
        It seems a paradox, does it not,
      </p>
      <p xml:id="subtitle2" begin="5.0s" end="10.0s">
        that the image formed on<br/>
        the Retina should be inverted?
      </p>
      <p xml:id="subtitle3" begin="10.0s" end="16.0s" style="s2">
        It is puzzling, why is it<br/>
        we do not see things upside-down?
      </p>
      <p xml:id="subtitle4" begin="17.2s" end="23.0s">
        You have never heard the Theory,<br/>
        then, that the Brain also is inverted?
      </p>
      <p xml:id="subtitle5" begin="23.0s" end="27.0s" style="s2">
        No indeed! What a beautiful fact!
      </p>
      <p xml:id="subtitle6a" begin="28.0s" end="34.6s" style="s2Left">
        But how is it proved?
      </p>
      <p xml:id="subtitle6b" begin="28.0s" end="34.6s" style="s1Right">
        Thus: what we call
      </p>
      <p xml:id="subtitle7" begin="34.6s" end="45.0s" style="s1Right">
        the vertex of the Brain<br/>
        is really its base
      </p>
      <p xml:id="subtitle8" begin="45.0s" end="52.0s" style="s1Right">
        and what we call its base<br/>
        is really its vertex,
      </p>
      <p xml:id="subtitle9a" begin="53.5s" end="58.7s">
        it is simply a question of nomenclature.
      </p>
      <p xml:id="subtitle9b" begin="53.5s" end="58.7s" style="s2">
        How truly delightful!
      </p>
    </div>
  </body>
</tt>`;

describe("Global TTML HTML parsing tests", () => {
  const res = parseTTMLToDiv(testingText, 0);
  it("should parse the right amount of cues at the right time", () => {
    expect(res).toHaveLength(11);
    expect(res[0].start).toEqual(0.76);
    expect(res[0].end).toEqual(3.45);

    expect(res[1].start).toEqual(5.0);
    expect(res[1].end).toEqual(10.0);

    expect(res[2].start).toEqual(10.0);
    expect(res[2].end).toEqual(16.0);

    expect(res[3].start).toEqual(17.2);
    expect(res[3].end).toEqual(23.0);

    expect(res[4].start).toEqual(23.0);
    expect(res[4].end).toEqual(27.0);

    expect(res[5].start).toEqual(28.0);
    expect(res[5].end).toEqual(34.6);

    expect(res[6].start).toEqual(28.0);
    expect(res[6].end).toEqual(34.6);

    expect(res[7].start).toEqual(34.6);
    expect(res[7].end).toEqual(45.0);

    expect(res[8].start).toEqual(45.0);
    expect(res[8].end).toEqual(52.0);

    expect(res[9].start).toEqual(53.5);
    expect(res[9].end).toEqual(58.7);

    expect(res[10].start).toEqual(53.5);
    expect(res[10].end).toEqual(58.7);
  });

  it("They all have an outputed HTMLElement", () => {
    expect(res.every((cue) => cue.element instanceof HTMLElement));
  });

  it("They all have the right text in them", () => {
    expect(res[0].element.textContent).toEqual("It seems a paradox, does it not,");
    expect(res[1].element.textContent).toEqual(
      "that the image formed onthe Retina should be inverted?",
    );
    expect(res[2].element.textContent).toEqual(
      "It is puzzling, why is itwe do not see things upside-down?",
    );
    expect(res[3].element.textContent).toEqual(
      "You have never heard the Theory,then, that the Brain also is inverted?",
    );
    expect(res[4].element.textContent).toEqual("No indeed! What a beautiful fact!");
    expect(res[5].element.textContent).toEqual("But how is it proved?");
    expect(res[6].element.textContent).toEqual("Thus: what we call");
    expect(res[7].element.textContent).toEqual(
      "the vertex of the Brainis really its base",
    );
    expect(res[8].element.textContent).toEqual(
      "and what we call its baseis really its vertex,",
    );
    expect(res[9].element.textContent).toEqual(
      "it is simply a question of nomenclature.",
    );
    expect(res[10].element.textContent).toEqual("How truly delightful!");
  });

  // TODO Is jsdom implementation in the wrong there?
  xit("corresponding text should have the right color", () => {
    function findTextNodes(elt: HTMLElement, currTextNodes: Text[] = []): Text[] {
      const children = elt.childNodes;
      for (let i = 0; i < children.length; i++) {
        switch (children[i].nodeType) {
          case Node.TEXT_NODE:
            currTextNodes.push(children[i] as Text);
            break;
          case Node.ELEMENT_NODE:
            return findTextNodes(children[i] as HTMLElement, currTextNodes);
        }
      }
      return currTextNodes;
    }
    let nbTextNodes = 0;
    const textNodes = findTextNodes(res[6].element);
    for (let i = 0; i < textNodes.length; i++) {
      const parentElement = textNodes[i].parentElement;
      if (parentElement !== null) {
        expect(globalScope.getComputedStyle(parentElement).color).toEqual("yellow");
        nbTextNodes++;
      }
    }
    expect(nbTextNodes).toBeGreaterThanOrEqual(1);
  });
});

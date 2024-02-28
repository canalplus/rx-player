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

import log from "../../../../../../log";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";
import { createAdaptationSetIntermediateRepresentation } from "../AdaptationSet";
import { MPDError } from "../utils";

function testBooleanAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="true" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: true },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(
      `<AdaptationSet ${attributeName}=\"false\" />`,
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="foobar" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not a boolean value but "foobar"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: { baseURLs: [], representations: [] },
      },
      [error1],
    ]);
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(1, error1.message);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not a boolean value but ""`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: { baseURLs: [], representations: [] },
      },
      [error2],
    ]);
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(2, error2.message);
    spyLog.mockRestore();
  });
}

function testStringAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="foobar" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: "foobar" },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}=\"\" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: "" },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);
    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });
}

function testMaybeDividedNumber(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="12.4" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12.4 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="27/2" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: 13.5 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(`\`${attributeName}\` property is invalid: "toto"`);
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(1, error1.message);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(`\`${attributeName}\` property is invalid: "PT5M"`);
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(2, error2.message);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(`\`${attributeName}\` property is invalid: ""`);

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(3, error3.message);
    spyLog.mockRestore();
  });
}

function testFloatAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50.12" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50.12 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(`\`${attributeName}\` property is invalid: "toto"`);
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(1, error1.message);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(`\`${attributeName}\` property is invalid: "PT5M"`);
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(2, error2.message);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(`\`${attributeName}\` property is invalid: ""`);

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(3, error3.message);
    spyLog.mockRestore();
  });
}

function testIntegerAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not an integer value but "toto"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(1, error1.message);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not an integer value but "PT5M"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(2, error2.message);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(
      `\`${attributeName}\` property is not an integer value but ""`,
    );

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(3, error3.message);
    spyLog.mockRestore();
  });
}

function testNumberOrBooleanAttribute(
  attributeName: string,
  variableName?: string,
): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50 },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but "toto"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(1, error1.message);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but "PT5M"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(2, error2.message);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but ""`,
    );

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(3, error3.message);
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with a boolean ${attributeName} attribute`, () => {
    const spyLog = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="true" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: true },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(
      `<AdaptationSet ${attributeName}=\"false\" />`,
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: { baseURLs: [], representations: [] },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });
}

describe("DASH Node Parsers - AdaptationSet", () => {
  it("should correctly parse an AdaptationSet element without attributes nor children", () => {
    const element = parseXml("<AdaptationSet />")[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [],
    ]);
  });

  testStringAttribute("audioSamplingRate");
  testBooleanAttribute("bitstreamSwitching");
  testStringAttribute("codecs");
  testBooleanAttribute("codingDependency");
  testStringAttribute("contentType");
  testMaybeDividedNumber("frameRate");
  testIntegerAttribute("group");
  testIntegerAttribute("height");
  testStringAttribute("id");
  testStringAttribute("lang", "language");
  testIntegerAttribute("maxBandwidth", "maxBitrate");
  testMaybeDividedNumber("maxFrameRate");
  testIntegerAttribute("maxHeight");
  testFloatAttribute("maxPlayoutRate");
  testIntegerAttribute("maxWidth");
  testFloatAttribute("maximumSAPPeriod");
  testStringAttribute("mimeType");
  testIntegerAttribute("minBandwidth", "minBitrate");
  testMaybeDividedNumber("minFrameRate");
  testIntegerAttribute("minHeight");
  testIntegerAttribute("minWidth");
  testStringAttribute("par");
  testStringAttribute("profiles");
  testNumberOrBooleanAttribute("segmentAlignment");
  testStringAttribute("segmentProfiles");
  testNumberOrBooleanAttribute("subsegmentAlignment");
  testIntegerAttribute("width");
  testFloatAttribute("availabilityTimeOffset");

  it("should correctly parse an empty baseURLs", () => {
    const element1 = parseXml("<AdaptationSet><BaseURL /></AdaptationSet>")[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [],
    ]);

    const element2 = parseXml(
      "<AdaptationSet><BaseURL></BaseURLs</AdaptationSet>",
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      { attributes: {}, children: { baseURLs: [], representations: [] } },
      [],
    ]);
  });

  it("should correctly parse a non-empty baseURLs", () => {
    const element1 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="foo">a</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: { baseURLs: [{ value: "a" }], representations: [] },
      },
      [],
    ]);

    const element2 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="4">foo bar</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: { baseURLs: [{ value: "foo bar" }], representations: [] },
      },
      [],
    ]);
  });

  it("should correctly parse multiple non-empty baseURLs", () => {
    const element1 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="">a</BaseURL><BaseURL serviceLocation="http://test.com">b</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          baseURLs: [{ value: "a" }, { value: "b" }],
          representations: [],
        },
      },
      [],
    ]);
  });
});
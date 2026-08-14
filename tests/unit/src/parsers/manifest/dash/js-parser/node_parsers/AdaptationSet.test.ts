import { describe, it, expect, vi } from "vitest";
import log from "../../../../../../../../src/log.ts";
import { createAdaptationSetIntermediateRepresentation } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/AdaptationSet.ts";
import { MPDError } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/utils.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

function testBooleanAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="true" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: true },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="false" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="foobar" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not a boolean value but "foobar"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error1],
    ]);
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(
      1,
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: attributeName },
    );

    const element2 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not a boolean value but ""`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error2],
    ]);
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(
      2,
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: attributeName },
    );
    spyLog.mockRestore();
  });
}

function testStringAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="foobar" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: "foobar" },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: "" },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
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
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="12.4" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12.4 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="27/2" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: 13.5 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(`\`${attributeName}\` property is invalid: "toto"`);
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(
      1,
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: attributeName },
    );

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(`\`${attributeName}\` property is invalid: "PT5M"`);
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(
      2,
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: attributeName },
    );

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(`\`${attributeName}\` property is invalid: ""`);

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(
      3,
      "dash",
      "failed to parse DASH value:",
      error3.message,
      { name: attributeName },
    );
    spyLog.mockRestore();
  });
}

function testFloatAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50.12" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50.12 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(`\`${attributeName}\` property is invalid: "toto"`);
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(
      1,
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: attributeName },
    );

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(`\`${attributeName}\` property is invalid: "PT5M"`);
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(
      2,
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: attributeName },
    );

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(`\`${attributeName}\` property is invalid: ""`);

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(
      3,
      "dash",
      "failed to parse DASH value:",
      error3.message,
      { name: attributeName },
    );
    spyLog.mockRestore();
  });
}

function testIntegerAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not an integer value but "toto"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(
      1,
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: attributeName },
    );

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not an integer value but "PT5M"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(
      2,
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: attributeName },
    );

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(
      `\`${attributeName}\` property is not an integer value but ""`,
    );

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(
      3,
      "dash",
      "failed to parse DASH value:",
      error3.message,
      { name: attributeName },
    );
    spyLog.mockRestore();
  });
}

function testNumberOrBooleanAttribute(
  attributeName: string,
  variableName?: string,
): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse an AdaptationSet element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="012" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: 12 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="0" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: 0 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element3 = parseXml(`<AdaptationSet ${attributeName}="-50" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: { [_variableName]: -50 },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="toto" />`)[0] as ITNode;
    const error1 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but "toto"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error1],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenNthCalledWith(
      1,
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: attributeName },
    );

    const element2 = parseXml(`<AdaptationSet ${attributeName}="PT5M" />`)[0] as ITNode;
    const error2 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but "PT5M"`,
    );
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error2],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenNthCalledWith(
      2,
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: attributeName },
    );

    const element3 = parseXml(`<AdaptationSet ${attributeName}="" />`)[0] as ITNode;
    const error3 = new MPDError(
      `\`${attributeName}\` property is not a boolean nor an integer but ""`,
    );

    expect(createAdaptationSetIntermediateRepresentation(element3)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [error3],
    ]);

    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenNthCalledWith(
      3,
      "dash",
      "failed to parse DASH value:",
      error3.message,
      { name: attributeName },
    );

    spyLog.mockRestore();
  });

  it(`should correctly parse an AdaptationSet element with a boolean ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<AdaptationSet ${attributeName}="true" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: { [_variableName]: true },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(`<AdaptationSet ${attributeName}="false" />`)[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: { [_variableName]: false },
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
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
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
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
  testStringAttribute("lang");
  testIntegerAttribute("maxBandwidth");
  testMaybeDividedNumber("maxFrameRate");
  testIntegerAttribute("maxHeight");
  testFloatAttribute("maxPlayoutRate");
  testIntegerAttribute("maxWidth");
  testFloatAttribute("maximumSAPPeriod");
  testStringAttribute("mimeType");
  testIntegerAttribute("minBandwidth");
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

  it("should correctly parse an empty BaseURL", () => {
    const element1 = parseXml("<AdaptationSet><BaseURL /></AdaptationSet>")[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(
      "<AdaptationSet><BaseURL></BaseURLs</AdaptationSet>",
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);
  });

  it("should correctly parse a non-empty BaseURL", () => {
    const element1 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="foo">a</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [{ value: "a", attributes: { serviceLocation: "foo" } }],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
          Representation: [],
        },
      },
      [],
    ]);

    const element2 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="4">foo bar</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element2)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [{ value: "foo bar", attributes: { serviceLocation: "4" } }],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);
  });

  it("should correctly parse multiple non-empty BaseURL", () => {
    const element1 = parseXml(
      '<AdaptationSet><BaseURL serviceLocation="">a</BaseURL><BaseURL serviceLocation="http://test.com">b</BaseURL></AdaptationSet>',
    )[0] as ITNode;
    expect(createAdaptationSetIntermediateRepresentation(element1)).toEqual([
      {
        attributes: {},
        children: {
          Accessibility: [],
          BaseURL: [
            { value: "a", attributes: { serviceLocation: "" } },
            { value: "b", attributes: { serviceLocation: "http://test.com" } },
          ],
          Representation: [],
          ContentComponent: [],
          ContentProtection: [],
          EssentialProperty: [],
          InbandEventStream: [],
          Label: [],
          Role: [],
          SegmentBase: [],
          SegmentList: [],
          SegmentTemplate: [],
          SupplementalProperty: [],
        },
      },
      [],
    ]);
  });
});

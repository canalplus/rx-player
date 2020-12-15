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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("Manifest - Period", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if no adaptation is given", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const args = { id: "12", adaptations: {}, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");
    expect(adaptationSpy).not.toHaveBeenCalled();
  });

  it("should throw if no audio nor video adaptation is given", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const fooAda1 = { type: "foo",
                      id: "54",
                      isSupported: true,
                      representations: [{}] };
    const fooAda2 = { type: "foo",
                      id: "55",
                      isSupported: true,
                      representations: [{}] };
    const foo = [fooAda1, fooAda2];
    const args = { id: "12", adaptations: { foo }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(adaptationSpy).toHaveBeenCalledTimes(2);
    expect(adaptationSpy).toHaveBeenNthCalledWith(1, fooAda1, {});
    expect(adaptationSpy).toHaveBeenNthCalledWith(2, fooAda2, {});
  });

  it("should throw if only empty audio and/or video adaptations is given", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const args = { id: "12", adaptations: { video: [], audio: [] }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(adaptationSpy).toHaveBeenCalledTimes(0);
  });

  it("should throw if we are left with no audio representation", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "56",
                        isSupported: true,
                        representations: [{}] };
    const videoAda3 = { type: "video",
                        id: "57",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = { type: "audio",
                        id: "58",
                        isSupported: true,
                        representations: [] };
    const audioAda2 = { type: "audio",
                        id: "59",
                        isSupported: true,
                        representations: [] };
    const audio = [audioAda1, audioAda2];
    const args = { id: "12", adaptations: { video, audio }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if no audio Adaptation is supported", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const videoAda3 = { type: "video",
                        id: "56",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = { type: "audio",
                        id: "57",
                        isSupported: false,
                        representations: [{}] };
    const audioAda2 = { type: "audio",
                        id: "58",
                        isSupported: false,
                        representations: [{}] };
    const audio = [audioAda1, audioAda2];
    const args = { id: "12", adaptations: { video, audio }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if we are left with no video representation", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [] };
    const videoAda3 = { type: "video",
                        id: "56",
                        isSupported: true,
                        representations: [] };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = { type: "audio",
                        id: "58",
                        isSupported: true,
                        representations: [{}] };
    const audioAda2 = { type: "audio",
                        id: "59",
                        isSupported: true,
                        representations: [{}] };
    const audio = [audioAda1, audioAda2];
    const args = { id: "12", adaptations: { video, audio }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should throw if no video adaptation is supported", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: false,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: false,
                        representations: [{}] };
    const videoAda3 = { type: "video",
                        id: "56",
                        isSupported: false,
                        representations: [{}] };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = { type: "audio",
                        id: "58",
                        isSupported: true,
                        representations: [{}] };
    const audioAda2 = { type: "audio",
                        id: "59",
                        isSupported: true,
                        representations: [{}] };
    const audio = [audioAda1, audioAda2];
    const args = { id: "12", adaptations: { video, audio }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should set a parsing error if an unsupported adaptation is given", () => {
    const { MediaError } = require("../../errors");

    const adaptationSpy = jest.fn(arg => {
      if (arg.type === "bar") {
        throw new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", "");
      }
      return { ...arg, parsingErrors: [] };
    });
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;

    const videoAda1 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1];
    const barAda1 = { type: "bar",
                      id: "55",
                      isSupported: true,
                      representations: [{}] };
    const bar = [barAda1];
    const args = { id: "12", adaptations: { bar, video }, start: 0 };
    const period = new Period(args as any);
    expect(period.adaptations).toEqual({
      video: video.map(v => ({ ...v, parsingErrors: [] })),
    });
    expect(period.parsingErrors).toHaveLength(1);

    expect(adaptationSpy).toHaveBeenCalledTimes(2);
    expect(adaptationSpy).toHaveReturnedTimes(1);
    expect(adaptationSpy).toHaveBeenCalledWith(videoAda1, {});
    expect(adaptationSpy).toHaveBeenCalledWith(barAda1, {});
    expect(adaptationSpy).toHaveReturnedWith(period.adaptations.video[0]);

    const [error] = period.parsingErrors;
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE");
    expect(error.type).toBe("MEDIA_ERROR");
  });

  /* eslint-disable max-len */
  it("should throw if the adaptation throws for another reason than an unsupported type", () => {
  /* eslint-enable max-len */
    const { MediaError } = require("../../errors");
    const adaptationSpy = jest.fn(arg => {
      if (arg.type === "bar") {
        throw new MediaError("MEDIA_ERR_UNKNOWN", "");
      }
      return { ...arg, parsingErrors: [] };
    });
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
    }));

    const Period = require("../period").default;

    const videoAda1 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1];
    const barAda1 = { type: "bar",
                      id: "55",
                      isSupported: true,
                      representations: [{}] };
    const bar = [barAda1];
    const args = { id: "12", adaptations: { bar, video }, start: 0 };
    let period = null;
    let errorReceived = null;
    try {
      period = new Period(args as any);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(errorReceived).toBeInstanceOf(MediaError);
    expect(errorReceived.code).toBe("MEDIA_ERR_UNKNOWN");
    expect(errorReceived.type).toBe("MEDIA_ERROR");
  });

  it("should not set a parsing error if an empty unsupported adaptation is given", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image", "foo"],
    }));

    const Period = require("../period").default;

    const videoAda1 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1];
    const bar = undefined;
    const args = { id: "12", adaptations: { bar, video }, start: 0 };
    const period = new Period(args as any);
    expect(period.adaptations).toEqual({
      video: video.map(v => ({ ...v, parsingErrors: [] })),
    });
    expect(period.parsingErrors).toHaveLength(0);

    expect(adaptationSpy).toHaveBeenCalledTimes(1);
    expect(adaptationSpy).toHaveBeenCalledWith(videoAda1, {});
  });

  it("should give a representationFilter to the adaptation", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    const representationFilter = jest.fn();
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];
    const args = { id: "12", adaptations: { video }, start: 0 };
    const period = new Period(args as any, representationFilter);

    expect(period.parsingErrors).toHaveLength(0);
    expect(period.adaptations.video).toHaveLength(2);

    expect(adaptationSpy).toHaveBeenCalledTimes(2);
    expect(adaptationSpy).toHaveBeenNthCalledWith(1, videoAda1, { representationFilter });
    expect(adaptationSpy).toHaveBeenNthCalledWith(2, videoAda2, { representationFilter });
    expect(representationFilter).not.toHaveBeenCalled();
  });

  it("should combine parsing errors from the Period and from the Adaptations", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [arg.id] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const fooAda1 = { type: "foo",
                      id: "12",
                      isSupported: true,
                      representations: [{}] };
    const video = [videoAda1, videoAda2];
    const foo = [fooAda1];
    const args = { id: "12", adaptations: { video, foo }, start: 0 };
    const period = new Period(args as any);

    expect(period.parsingErrors).toHaveLength(3);
    expect(period.parsingErrors).toContain("54");
    expect(period.parsingErrors).toContain("55");
  });

  it("should set the given start", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];
    const args = { id: "12", adaptations: { video }, start: 72 };
    const period = new Period(args as any);
    expect(period.start).toEqual(72);
    expect(period.duration).toEqual(undefined);
    expect(period.end).toEqual(undefined);
  });

  it("should set a given duration", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];
    const args = { id: "12", adaptations: { video }, start: 0, duration: 12 };
    const period = new Period(args as any);
    expect(period.start).toEqual(0);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(12);
  });

  it("should infer the end from the start and the duration", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];
    const args = { id: "12", adaptations: { video }, start: 50, duration: 12 };
    const period = new Period(args as any);
    expect(period.start).toEqual(50);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(62);
  });

  it("should return every Adaptations combined with `getAdaptations`", () => {
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];

    const audioAda1 = { type: "audio",
                        id: "56",
                        isSupported: true,
                        representations: [{}] };
    const audio = [audioAda1];

    const args = { id: "12", adaptations: { video, audio }, start: 50, duration: 12 };
    const period = new Period(args as any);

    expect(period.getAdaptations()).toHaveLength(3);
    expect(period.getAdaptations()).toContain(period.adaptations.video[0]);
    expect(period.getAdaptations()).toContain(period.adaptations.video[1]);
    expect(period.getAdaptations()).toContain(period.adaptations.audio[0]);
  });

  /* eslint-disable max-len */
  it("should return every Adaptations from a given type with `getAdaptationsForType`", () => {
  /* eslint-enable max-len */
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2];

    const audioAda1 = { type: "audio",
                        id: "56",
                        isSupported: true,
                        representations: [{}] };
    const audio = [audioAda1];

    const args = { id: "12", adaptations: { video, audio }, start: 50, duration: 12 };
    const period = new Period(args as any);

    expect(period.getAdaptationsForType("video")).toHaveLength(2);
    expect(period.getAdaptationsForType("video"))
      .toEqual([period.adaptations.video[0], period.adaptations.video[1]]);

    expect(period.getAdaptationsForType("audio")).toHaveLength(1);
    expect(period.getAdaptationsForType("audio")).toEqual([
      period.adaptations.audio[0],
    ]);

    expect(period.getAdaptationsForType("image")).toHaveLength(0);
    expect(period.getAdaptationsForType("text")).toHaveLength(0);
  });

  /* eslint-disable max-len */
  it("should return the first Adaptations with a given Id when calling `getAdaptation`", () => {
  /* eslint-enable max-len */
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));

    const Period = require("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: true,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const videoAda3 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = { type: "audio",
                        id: "56",
                        isSupported: true,
                        representations: [{}] };
    const audio = [audioAda1];

    const args = { id: "12", adaptations: { video, audio }, start: 50, duration: 12 };
    const period = new Period(args as any);

    expect(period.getAdaptation("54")).toEqual(period.adaptations.video[0]);
    expect(period.getAdaptation("55")).toEqual(period.adaptations.video[1]);
    expect(period.getAdaptation("56")).toEqual(period.adaptations.audio[0]);
  });

  /* eslint-disable max-len */
  it("should return undefind if no adaptation has the given Id when calling `getAdaptation`", () => {
  /* eslint-enable max-len */
    const adaptationSpy = jest.fn(arg => ({ ...arg, parsingErrors: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: adaptationSpy,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "image"],
    }));
  });
});

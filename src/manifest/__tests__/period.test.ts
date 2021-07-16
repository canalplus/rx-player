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
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");
    expect(mockAdaptation).not.toHaveBeenCalled();
  });

  it("should throw if no audio nor video adaptation is given", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation).toHaveBeenNthCalledWith(1, fooAda1, {});
    expect(mockAdaptation).toHaveBeenNthCalledWith(2, fooAda2, {});
  });

  it("should throw if only empty audio and/or video adaptations is given", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(mockAdaptation).toHaveBeenCalledTimes(0);
  });

  it("should throw if we are left with no audio representation", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if no audio Adaptation is supported", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if we are left with no video representation", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should throw if no video adaptation is supported", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;
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
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code? : string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type? : string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should set a parsing error if an unsupported adaptation is given", () => {
    const mockAdaptation = jest.fn(arg => {
      return { ...arg };
    });
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;

    const videoAda1 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1];
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: false,
                        representations: [{}] };
    const video2 = [videoAda2];
    const args = { id: "12", adaptations: { video, video2 }, start: 0 };
    const period = new Period(args);
    expect(period.contentWarnings).toHaveLength(1);

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation).toHaveReturnedTimes(2);
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda1, {});
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda2, {});
    expect(mockAdaptation).toHaveReturnedWith(period.adaptations.video[0]);

    const [error] = period.contentWarnings;
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect(error.type).toBe("MEDIA_ERROR");
  });

  it("should not set a parsing error if an empty unsupported adaptation is given", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = jest.requireActual("../period").default;

    const videoAda1 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const video = [videoAda1];
    const bar = undefined;
    const args = { id: "12", adaptations: { bar, video }, start: 0 };
    const period = new Period(args);
    expect(period.adaptations).toEqual({
      video: video.map(v => ({ ...v, contentWarnings: [] })),
    });
    expect(period.contentWarnings).toHaveLength(0);

    expect(mockAdaptation).toHaveBeenCalledTimes(1);
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda1, {});
  });

  it("should give a representationFilter to the adaptation", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    const representationFilter = jest.fn();
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args, representationFilter);

    expect(period.contentWarnings).toHaveLength(0);
    expect(period.adaptations.video).toHaveLength(2);

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation)
      .toHaveBeenNthCalledWith(1, videoAda1, { representationFilter });
    expect(mockAdaptation)
      .toHaveBeenNthCalledWith(2, videoAda2, { representationFilter });
    expect(representationFilter).not.toHaveBeenCalled();
  });

  it("should add contentWarnings if Adaptations are not supported", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: false,
                        representations: [{}] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const fooAda1 = { type: "foo",
                      id: "12",
                      isSupported: false,
                      representations: [{}] };
    const video = [videoAda1, videoAda2];
    const foo = [fooAda1];
    const args = { id: "12", adaptations: { video, foo }, start: 0 };
    const period = new Period(args);

    expect(period.contentWarnings).toHaveLength(2);
    const error = period.contentWarnings[0];
    expect(error.code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect(error.type).toEqual("MEDIA_ERROR");

    const error2 = period.contentWarnings[1];
    expect(error2.code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect(error2.type).toEqual("MEDIA_ERROR");
  });

  it("should not add contentWarnings if an Adaptation has no Representation", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
    const videoAda1 = { type: "video",
                        id: "54",
                        isSupported: false,
                        representations: [] };
    const videoAda2 = { type: "video",
                        id: "55",
                        isSupported: true,
                        representations: [{}] };
    const fooAda1 = { type: "foo",
                      id: "12",
                      isSupported: false,
                      representations: [] };
    const video = [videoAda1, videoAda2];
    const foo = [fooAda1];
    const args = { id: "12", adaptations: { video, foo }, start: 0 };
    const period = new Period(args);

    expect(period.contentWarnings).toHaveLength(0);
  });

  it("should set the given start", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);
    expect(period.start).toEqual(72);
    expect(period.duration).toEqual(undefined);
    expect(period.end).toEqual(undefined);
  });

  it("should set a given duration", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);
    expect(period.start).toEqual(0);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(12);
  });

  it("should infer the end from the start and the duration", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);
    expect(period.start).toEqual(50);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(62);
  });

  it("should return every Adaptations combined with `getAdaptations`", () => {
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);

    expect(period.getAdaptations()).toHaveLength(3);
    expect(period.getAdaptations()).toContain(period.adaptations.video[0]);
    expect(period.getAdaptations()).toContain(period.adaptations.video[1]);
    expect(period.getAdaptations()).toContain(period.adaptations.audio[0]);
  });

  /* eslint-disable max-len */
  it("should return every Adaptations from a given type with `getAdaptationsForType`", () => {
  /* eslint-enable max-len */
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);

    expect(period.getAdaptationsForType("video")).toHaveLength(2);
    expect(period.getAdaptationsForType("video"))
      .toEqual([period.adaptations.video[0], period.adaptations.video[1]]);

    expect(period.getAdaptationsForType("audio")).toHaveLength(1);
    expect(period.getAdaptationsForType("audio")).toEqual([
      period.adaptations.audio[0],
    ]);

    expect(period.getAdaptationsForType("text")).toHaveLength(0);
  });

  /* eslint-disable max-len */
  it("should return the first Adaptations with a given Id when calling `getAdaptation`", () => {
  /* eslint-enable max-len */
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = jest.requireActual("../period").default;
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
    const period = new Period(args);

    expect(period.getAdaptation("54")).toEqual(period.adaptations.video[0]);
    expect(period.getAdaptation("55")).toEqual(period.adaptations.video[1]);
    expect(period.getAdaptation("56")).toEqual(period.adaptations.audio[0]);
  });

  /* eslint-disable max-len */
  it("should return undefind if no adaptation has the given Id when calling `getAdaptation`", () => {
  /* eslint-enable max-len */
    const mockAdaptation = jest.fn(arg => ({ ...arg, contentWarnings: [] }));
    jest.mock("../adaptation", () => ({
      __esModule: true as const,
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));
  });
});

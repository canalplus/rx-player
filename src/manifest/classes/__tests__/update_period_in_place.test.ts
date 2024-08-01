import type { MockInstance } from "vitest";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import log from "../../../log";
import type Period from "../period";
import { MANIFEST_UPDATE_TYPE } from "../types";
import updatePeriodInPlace from "../update_period_in_place";

/* eslint-disable @typescript-eslint/no-explicit-any */

const oldVideoRepresentation1 = {
  id: "rep-video-1",
  getMetadataSnapshot() {
    return { id: "rep-video-1", bitrate: 5 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const oldVideoRepresentation2 = {
  id: "rep-video-2",
  getMetadataSnapshot() {
    return { id: "rep-video-2", bitrate: 6 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const oldVideoRepresentation3 = {
  id: "rep-video-3",
  getMetadataSnapshot() {
    return { id: "rep-video-3", bitrate: 7 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const oldVideoRepresentation4 = {
  id: "rep-video-4",
  getMetadataSnapshot() {
    return { id: "rep-video-4", bitrate: 8 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const oldAudioRepresentation = {
  id: "rep-audio-1",
  getMetadataSnapshot() {
    return { id: "rep-audio-1", bitrate: 65 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};

const newVideoRepresentation1 = {
  id: "rep-video-1",
  getMetadataSnapshot() {
    return { id: "rep-video-2", bitrate: 11 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const newVideoRepresentation2 = {
  id: "rep-video-2",
  getMetadataSnapshot() {
    return { id: "rep-video-2", bitrate: 12 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const newVideoRepresentation3 = {
  id: "rep-video-3",
  getMetadataSnapshot() {
    return { id: "rep-video-3", bitrate: 13 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const newVideoRepresentation4 = {
  id: "rep-video-4",
  getMetadataSnapshot() {
    return { id: "rep-video-4", bitrate: 14 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};
const newAudioRepresentation = {
  id: "rep-audio-1",
  getMetadataSnapshot() {
    return { id: "rep-audio-1", bitrate: 69 };
  },
  index: {
    _update() {
      /* noop */
    },
    _replace() {
      /* noop */
    },
  },
};

function generateFakeAdaptation({
  type,
  id,
  representations,
}: {
  type: string;
  id: string;
  representations: unknown[];
}) {
  return {
    id,
    type,
    getMetadataSnapshot() {
      return { id, type, representations };
    },
    representations,
  };
}

describe("Manifest - updatePeriodInPlace", () => {
  let mockOldVideoRepresentation1Replace: MockInstance | undefined;
  let mockOldVideoRepresentation2Replace: MockInstance | undefined;
  let mockOldVideoRepresentation3Replace: MockInstance | undefined;
  let mockOldVideoRepresentation4Replace: MockInstance | undefined;
  let mockOldAudioRepresentationReplace: MockInstance | undefined;
  let mockOldVideoRepresentation1Update: MockInstance | undefined;
  let mockOldVideoRepresentation2Update: MockInstance | undefined;
  let mockOldVideoRepresentation3Update: MockInstance | undefined;
  let mockOldVideoRepresentation4Update: MockInstance | undefined;
  let mockOldAudioRepresentationUpdate: MockInstance | undefined;
  let mockNewVideoRepresentation1Replace: MockInstance | undefined;
  let mockNewVideoRepresentation2Replace: MockInstance | undefined;
  let mockNewVideoRepresentation3Replace: MockInstance | undefined;
  let mockNewVideoRepresentation4Replace: MockInstance | undefined;
  let mockNewAudioRepresentationReplace: MockInstance | undefined;
  let mockNewVideoRepresentation1Update: MockInstance | undefined;
  let mockNewVideoRepresentation2Update: MockInstance | undefined;
  let mockNewVideoRepresentation3Update: MockInstance | undefined;
  let mockNewVideoRepresentation4Update: MockInstance | undefined;
  let mockNewAudioRepresentationUpdate: MockInstance | undefined;

  beforeEach(() => {
    mockOldVideoRepresentation1Replace = vi.spyOn(
      oldVideoRepresentation1.index,
      "_replace",
    );
    mockOldVideoRepresentation2Replace = vi.spyOn(
      oldVideoRepresentation2.index,
      "_replace",
    );
    mockOldVideoRepresentation3Replace = vi.spyOn(
      oldVideoRepresentation3.index,
      "_replace",
    );
    mockOldVideoRepresentation4Replace = vi.spyOn(
      oldVideoRepresentation4.index,
      "_replace",
    );
    mockOldAudioRepresentationReplace = vi.spyOn(
      oldAudioRepresentation.index,
      "_replace",
    );
    mockOldVideoRepresentation1Update = vi.spyOn(
      oldVideoRepresentation1.index,
      "_update",
    );
    mockOldVideoRepresentation2Update = vi.spyOn(
      oldVideoRepresentation2.index,
      "_update",
    );
    mockOldVideoRepresentation3Update = vi.spyOn(
      oldVideoRepresentation3.index,
      "_update",
    );
    mockOldVideoRepresentation4Update = vi.spyOn(
      oldVideoRepresentation4.index,
      "_update",
    );
    mockOldAudioRepresentationUpdate = vi.spyOn(oldAudioRepresentation.index, "_update");
    mockNewVideoRepresentation1Replace = vi.spyOn(
      newVideoRepresentation1.index,
      "_replace",
    );
    mockNewVideoRepresentation2Replace = vi.spyOn(
      newVideoRepresentation2.index,
      "_replace",
    );
    mockNewVideoRepresentation3Replace = vi.spyOn(
      newVideoRepresentation3.index,
      "_replace",
    );
    mockNewVideoRepresentation4Replace = vi.spyOn(
      newVideoRepresentation4.index,
      "_replace",
    );
    mockNewAudioRepresentationReplace = vi.spyOn(
      newAudioRepresentation.index,
      "_replace",
    );
    mockNewVideoRepresentation1Update = vi.spyOn(
      newVideoRepresentation1.index,
      "_update",
    );
    mockNewVideoRepresentation2Update = vi.spyOn(
      newVideoRepresentation2.index,
      "_update",
    );
    mockNewVideoRepresentation3Update = vi.spyOn(
      newVideoRepresentation3.index,
      "_update",
    );
    mockNewVideoRepresentation4Update = vi.spyOn(
      newVideoRepresentation4.index,
      "_update",
    );
    mockNewAudioRepresentationUpdate = vi.spyOn(newAudioRepresentation.index, "_update");
  });

  afterEach(() => {
    mockOldVideoRepresentation1Replace?.mockRestore();
    mockOldVideoRepresentation2Replace?.mockRestore();
    mockOldVideoRepresentation3Replace?.mockRestore();
    mockOldVideoRepresentation4Replace?.mockRestore();
    mockOldAudioRepresentationReplace?.mockRestore();
    mockOldVideoRepresentation1Update?.mockRestore();
    mockOldVideoRepresentation2Update?.mockRestore();
    mockOldVideoRepresentation3Update?.mockRestore();
    mockOldVideoRepresentation4Update?.mockRestore();
    mockOldAudioRepresentationUpdate?.mockRestore();
    mockNewVideoRepresentation1Replace?.mockRestore();
    mockNewVideoRepresentation2Replace?.mockRestore();
    mockNewVideoRepresentation3Replace?.mockRestore();
    mockNewVideoRepresentation4Replace?.mockRestore();
    mockNewAudioRepresentationReplace?.mockRestore();
    mockNewVideoRepresentation1Update?.mockRestore();
    mockNewVideoRepresentation2Update?.mockRestore();
    mockNewVideoRepresentation3Update?.mockRestore();
    mockNewVideoRepresentation4Update?.mockRestore();
    mockNewAudioRepresentationUpdate?.mockRestore();
  });

  it("should fully update the first Period given by the second one in a full update", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
    };

    const oldPeriodAdaptations = vi.spyOn(oldPeriod, "getAdaptations");
    const newPeriodAdaptations = vi.spyOn(newPeriod, "getAdaptations");
    const mockLog = vi.spyOn(log, "warn");

    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Full,
    );

    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-video-2",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation3.getMetadataSnapshot(),
            oldVideoRepresentation4.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(oldPeriodAdaptations).toHaveBeenCalledTimes(1);

    expect(mockOldVideoRepresentation1Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation1Replace).toHaveBeenCalledWith(
      newVideoRepresentation1.index,
    );

    expect(mockOldVideoRepresentation2Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation2Replace).toHaveBeenCalledWith(
      newVideoRepresentation2.index,
    );

    expect(mockOldVideoRepresentation3Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation3Replace).toHaveBeenCalledWith(
      newVideoRepresentation3.index,
    );

    expect(mockOldVideoRepresentation4Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation4Replace).toHaveBeenCalledWith(
      newVideoRepresentation4.index,
    );

    expect(mockOldAudioRepresentationReplace).toHaveBeenCalledTimes(1);
    expect(mockOldAudioRepresentationReplace).toHaveBeenCalledWith(
      newAudioRepresentation.index,
    );

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(newPeriodAdaptations).toHaveBeenCalledTimes(1);

    expect(mockNewVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationReplace).not.toHaveBeenCalled();

    expect(mockOldVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockOldAudioRepresentationUpdate).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationUpdate).not.toHaveBeenCalled();

    expect(mockLog).toHaveBeenCalledTimes(0);
    mockLog.mockRestore();
  });

  it("should partially update the first Period given by the second one in a partial update", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
    };

    const mockOldPeriodGetAdaptations = vi.spyOn(oldPeriod, "getAdaptations");
    const mockNewPeriodGetAdaptations = vi.spyOn(newPeriod, "getAdaptations");
    const mockLog = vi.spyOn(log, "warn");

    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-video-2",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation3.getMetadataSnapshot(),
            oldVideoRepresentation4.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(mockOldPeriodGetAdaptations).toHaveBeenCalledTimes(1);

    expect(mockOldVideoRepresentation1Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation1Update).toHaveBeenCalledWith(
      newVideoRepresentation1.index,
    );

    expect(mockOldVideoRepresentation2Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation2Update).toHaveBeenCalledWith(
      newVideoRepresentation2.index,
    );

    expect(mockOldVideoRepresentation3Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation3Update).toHaveBeenCalledWith(
      newVideoRepresentation3.index,
    );

    expect(mockOldVideoRepresentation4Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation4Update).toHaveBeenCalledWith(
      newVideoRepresentation4.index,
    );

    expect(mockOldAudioRepresentationUpdate).toHaveBeenCalledTimes(1);
    expect(mockOldAudioRepresentationUpdate).toHaveBeenCalledWith(
      newAudioRepresentation.index,
    );

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(mockNewPeriodGetAdaptations).toHaveBeenCalledTimes(1);

    expect(mockNewVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationUpdate).not.toHaveBeenCalled();

    expect(mockOldVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockOldAudioRepresentationReplace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationReplace).not.toHaveBeenCalled();

    expect(mockLog).toHaveBeenCalledTimes(0);
    mockLog.mockRestore();
  });

  it("should add new Adaptations in Full mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Full,
    );
    expect(res).toEqual({
      addedAdaptations: [newVideoAdaptation2.getMetadataSnapshot()],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalled();
    expect(mockLog).toHaveBeenNthCalledWith(
      1,
      "Manifest: 1 new Adaptations found when merging.",
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should add new Adaptations in Partial mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(res).toEqual({
      addedAdaptations: [newVideoAdaptation2.getMetadataSnapshot()],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalled();
    expect(mockLog).toHaveBeenNthCalledWith(
      1,
      "Manifest: 1 new Adaptations found when merging.",
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should remove unfound Adaptations in Full mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Full,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [
        {
          id: "ada-video-2",
          trackType: "video",
        },
      ],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalled();
    expect(mockLog).toHaveBeenNthCalledWith(
      1,
      'Manifest: Adaptation "ada-video-2" not found when merging.',
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should remove unfound Adaptations in Partial mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldVideoAdaptation2 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [
        {
          id: "ada-video-2",
          trackType: "video",
        },
      ],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [
            oldVideoRepresentation1.getMetadataSnapshot(),
            oldVideoRepresentation2.getMetadataSnapshot(),
          ],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalled();
    expect(mockLog).toHaveBeenNthCalledWith(
      1,
      'Manifest: Adaptation "ada-video-2" not found when merging.',
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should add new Representations in Full mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };

    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Full,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [newVideoRepresentation2.getMetadataSnapshot()],
          removedRepresentations: [],
          updatedRepresentations: [oldVideoRepresentation1.getMetadataSnapshot()],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: 1 new Representations found when merging.",
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should add new Representations in Partial mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };

    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [newVideoRepresentation2.getMetadataSnapshot()],
          removedRepresentations: [],
          updatedRepresentations: [oldVideoRepresentation1.getMetadataSnapshot()],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: 1 new Representations found when merging.",
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should remove an old Representation that is not found in Full mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Full,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [oldVideoRepresentation2.id],
          updatedRepresentations: [oldVideoRepresentation1.getMetadataSnapshot()],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      'Manifest: Representation "rep-video-2" not found when merging.',
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    mockLog.mockRestore();
  });

  it("should remove an old Representation that is not found in Partial mode", () => {
    const oldVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    });
    const oldAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    });
    const oldPeriod = {
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = generateFakeAdaptation({
      type: "video",
      id: "ada-video-1",
      representations: [newVideoRepresentation1],
    });
    const newAudioAdaptation = generateFakeAdaptation({
      type: "audio",
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    });
    const newPeriod = {
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
      getMetadataSnapshot() {
        return {};
      },
    };

    const mockLog = vi.spyOn(log, "warn");
    const res = updatePeriodInPlace(
      oldPeriod as unknown as Period,
      newPeriod as unknown as Period,
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(res).toEqual({
      addedAdaptations: [],
      removedAdaptations: [],
      updatedAdaptations: [
        {
          adaptation: "ada-video-1",
          trackType: "video",
          addedRepresentations: [],
          removedRepresentations: [oldVideoRepresentation2.id],
          updatedRepresentations: [oldVideoRepresentation1.getMetadataSnapshot()],
        },
        {
          adaptation: "ada-audio-1",
          trackType: "audio",
          addedRepresentations: [],
          removedRepresentations: [],
          updatedRepresentations: [oldAudioRepresentation.getMetadataSnapshot()],
        },
      ],
    });
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      'Manifest: Representation "rep-video-2" not found when merging.',
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    mockLog.mockRestore();
  });
});

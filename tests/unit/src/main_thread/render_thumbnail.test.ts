import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPublicApiContentInfos } from "../../../../src/main_thread/api/public_api.ts";
import renderThumbnail from "../../../../src/main_thread/render_thumbnail.ts";
import TaskCanceller from "../../../../src/utils/task_canceller.ts";

const { mockGetPeriodForTime } = vi.hoisted(() => {
  return {
    mockGetPeriodForTime: vi.fn(() => ({
      id: "period-1",
      thumbnailTracks: [{ id: "thumb-track-1" }],
    })),
  };
});

vi.mock("../../../../src/manifest", () => ({
  getPeriodForTime: mockGetPeriodForTime,
}));

describe("renderThumbnail", () => {
  let imageInstances: FakeImage[];

  beforeEach(() => {
    imageInstances = [];
    vi.stubGlobal(
      "Image",
      class FakeImage {
        public onload: null | (() => void) = null;
        public onerror: null | (() => void) = null;
        value: string = "";

        set src(value: string) {
          this.value = value;
          imageInstances.push(this);
        }
        get src(): string {
          return this.value;
        }
      },
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:thumbnail"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the newer thumbnail when an aborted older request finishes later", async () => {
    let resolveFirstFetch!: (value: IThumbnailResponseLike) => void;
    const contentInfos = createContentInfos(
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<IThumbnailResponseLike>((resolve) => {
              resolveFirstFetch = resolve;
            }),
        )
        .mockResolvedValueOnce(makeThumbnailResponse(10, 20)),
    );
    const container = document.createElement("div");

    const firstPromise = renderThumbnail(contentInfos, { container, time: 0.5 });
    const secondPromise = renderThumbnail(contentInfos, { container, time: 12 });

    await Promise.resolve();
    expect(imageInstances).toHaveLength(1);
    imageInstances[0].onload?.();
    await expect(secondPromise).resolves.toBeUndefined();
    expect(container.childElementCount).toBe(1);

    resolveFirstFetch(makeThumbnailResponse(0, 10));
    await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild?.className).toBe("__rx-thumbnail__");
  });

  it("does not remove the newer pending request when an older request aborts", async () => {
    let resolveFirstFetch!: (value: IThumbnailResponseLike) => void;
    const contentInfos = createContentInfos(
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<IThumbnailResponseLike>((resolve) => {
              resolveFirstFetch = resolve;
            }),
        )
        .mockResolvedValueOnce(makeThumbnailResponse(10, 20)),
    );
    const container = document.createElement("div");

    const firstPromise = renderThumbnail(contentInfos, { container, time: 0.5 });
    const secondPromise = renderThumbnail(contentInfos, { container, time: 12 });
    const pendingRequest =
      contentInfos.thumbnailRequestsInfo.pendingRequests.get(container);

    expect(pendingRequest).toBeDefined();
    await Promise.resolve();
    expect(imageInstances).toHaveLength(1);

    resolveFirstFetch(makeThumbnailResponse(0, 10));
    await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
    expect(contentInfos.thumbnailRequestsInfo.pendingRequests.get(container)).toBe(
      pendingRequest,
    );

    imageInstances[0].onload?.();
    await expect(secondPromise).resolves.toBeUndefined();
    expect(
      contentInfos.thumbnailRequestsInfo.pendingRequests.get(container),
    ).toBeUndefined();
  });
});

function createContentInfos(
  fetchThumbnailDataCallback: (
    periodId: string,
    thumbnailTrackId: string,
    time: number,
  ) => Promise<IThumbnailResponseLike>,
): IPublicApiContentInfos {
  return {
    contentId: "content-1",
    originalUrl: undefined,
    manifest: {} as IPublicApiContentInfos["manifest"],
    currentPeriod: null,
    activeAdaptations: null,
    activeRepresentations: null,
    defaultAudioTrackSwitchingMode: "reload",
    fetchThumbnailDataCallback,
    handledTrackTypes: {
      audio: true,
      video: true,
      text: true,
    },
    initializer: {} as IPublicApiContentInfos["initializer"],
    isDirectFile: false,
    mediaElementTracksStore: null,
    onAudioTracksNotPlayable: "continue",
    onVideoTracksNotPlayable: "continue",
    playbackObserver: {} as IPublicApiContentInfos["playbackObserver"],
    segmentSinkMetricsCallback: null,
    thumbnailRequestsInfo: {
      pendingRequests: new WeakMap(),
      lastResponse: null,
    },
    tracksStore: null,
    useWorker: false,
    currentContentCanceller: new TaskCanceller("content"),
  };
}

function makeThumbnailResponse(start: number, end: number): IThumbnailResponseLike {
  return {
    data: new Uint8Array([1, 2, 3]).buffer,
    mimeType: "image/jpeg",
    thumbnails: [
      {
        start,
        end,
        width: 320,
        height: 180,
        offsetX: 0,
        offsetY: 0,
      },
    ],
  };
}

interface IThumbnailResponseLike {
  data: ArrayBuffer;
  mimeType: string;
  thumbnails: Array<{
    start: number;
    end: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  }>;
}

interface FakeImage {
  onload: null | (() => void);
  onerror: null | (() => void);
}

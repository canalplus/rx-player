import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/features/list/index.js";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import thumbnailInfos from "../../contents/static/DASH_static_SegmentTimeline/thumbnails.js";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

function createContainer() {
  const elt = document.createElement("div");
  elt.style.width = "320px";
  elt.style.height = "180px";
  document.body.appendChild(elt);
  return elt;
}

function expectRenderedThumbnail(container) {
  expect(container.childElementCount).toBe(1);
  expect(container.firstElementChild).not.toBeNull();
  expect(container.firstElementChild.className).toBe("__rx-thumbnail__");
  expect(container.firstElementChild.tagName).toBe("CANVAS");
  expect(container.firstElementChild.width).toBe(320);
  expect(container.firstElementChild.height).toBe(180);
}

runDashRenderThumbnailTests();
runDashRenderThumbnailTests({ multithread: true });

function runDashRenderThumbnailTests({ multithread } = {}) {
  let title = "DASH renderThumbnail";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title = "DASH renderThumbnail with worker";
  }

  describe(title, () => {
    let player;
    let container1;
    let container2;
    let delayedThumbnailRequests;

    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
      container1 = createContainer();
      container2 = createContainer();
      delayedThumbnailRequests = null;
    });

    afterEach(() => {
      delayedThumbnailRequests?.restore();
      player.dispose();
      container1.remove();
      container2.remove();
    });

    it("should fetch and render DASH thumbnails", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      expect(player.getAvailableThumbnailTracks({ time: 0.5 })).toEqual([
        {
          id: "thumbnails_320x180",
          width: 320,
          height: 180,
          mimeType: "image/jpeg",
        },
      ]);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });

      expectRenderedThumbnail(container1);
    });

    it("should abort the previous render when requesting another thumbnail on the same container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
      });
    });

    if (multithread !== true) {
      it("should keep the newer thumbnail if the older request resolves after being aborted", async () => {
        player.loadVideo({
          url: thumbnailInfos.url,
          transport: "dash",
          mode: "main",
        });
        await waitForLoadedStateAfterLoadVideo(player);

        delayedThumbnailRequests = delayThumbnailRequests(["tile_1.jpg"]);

        const firstPromise = player.renderThumbnail({
          container: container1,
          time: 0.5,
        });
        await delayedThumbnailRequests.waitForRequest("tile_1.jpg");

        const secondPromise = player.renderThumbnail({
          container: container1,
          time: 12,
        });

        await expect(secondPromise).resolves.toBeUndefined();
        expectRenderedThumbnail(container1);

        delayedThumbnailRequests.release("tile_1.jpg");
        await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });

        await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
          expectRenderedThumbnail(container1);
        });
      });

      it("should still abort the latest pending render after an older aborted request resolves", async () => {
        player.loadVideo({
          url: thumbnailInfos.url,
          transport: "dash",
          mode: "main",
        });
        await waitForLoadedStateAfterLoadVideo(player);

        delayedThumbnailRequests = delayThumbnailRequests(["tile_1.jpg", "tile_2.jpg"]);

        const firstPromise = player.renderThumbnail({
          container: container1,
          time: 0.5,
        });
        await delayedThumbnailRequests.waitForRequest("tile_1.jpg");

        const secondPromise = player.renderThumbnail({
          container: container1,
          time: 12,
        });
        await delayedThumbnailRequests.waitForRequest("tile_2.jpg");

        delayedThumbnailRequests.release("tile_1.jpg");
        await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });

        const thirdPromise = player.renderThumbnail({
          container: container1,
          time: 24,
        });

        delayedThumbnailRequests.release("tile_2.jpg");
        await expect(secondPromise).rejects.toMatchObject({ code: "ABORTED" });
        await expect(thirdPromise).resolves.toBeUndefined();

        await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
          expectRenderedThumbnail(container1);
        });
      });
    }

    it("should keep or clear the previous thumbnail on error depending on keepPreviousThumbnailOnError", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
          keepPreviousThumbnailOnError: true,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expect(container1.childElementCount).toBe(0);
    });

    it("should not cancel a shared thumbnail request when aborting only one container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container2,
        time: 0.5,
      });
      const replacementPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();
      await expect(replacementPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
        expectRenderedThumbnail(container2);
      });
    });
  });
}

function delayThumbnailRequests(fileNames) {
  const NativeXHR = XMLHttpRequest;
  const nativeOpen = NativeXHR.prototype.open;
  const nativeSend = NativeXHR.prototype.send;
  /**
   * Delayed XHRs, grouped by thumbnail file name.
   * Multiple requests for the same asset can pile up before we release them,
   * so each file name maps to a FIFO queue instead of a single request.
   * @type {Map<string, Array<{
   *   xhr: XMLHttpRequest & { __thumbnailTestUrl?: string },
   *   body: Document | XMLHttpRequestBodyInit | null | undefined
   * }>>}
   */
  const delayedRequests = new Map();
  /**
   * Promise awaited by the next `waitForRequest(fileName)` call for each file.
   * It gets replaced when several waits are queued for the same asset.
   * @type {Map<string, Promise<void>>}
   */
  const requestPromises = new Map();
  /**
   * Resolver paired with `requestPromises`.
   * We keep it around until the corresponding delayed request reaches `send`.
   * @type {Map<string, () => void>}
   */
  const requestResolvers = new Map();
  /**
   * Number of `waitForRequest` calls still waiting to be matched for each file.
   * This lets the helper observe multiple concurrent XHRs for the same asset
   * without collapsing them into a single notification.
   * @type {Map<string, number>}
   */
  const waitingRequestCounts = new Map();
  const waitingFileNames = new Set(fileNames);

  XMLHttpRequest.prototype.open = function open(method, url, async, user, password) {
    const xhr = /** @type {XMLHttpRequest & { __thumbnailTestUrl?: string }} */ (this);
    /**
     * Keep the request URL on the XHR instance so `send` can decide whether this
     * request should be delayed by the helper.
     */
    xhr.__thumbnailTestUrl = url;
    return nativeOpen.call(xhr, method, url, async, user, password);
  };

  /**
   * Resolve the promise corresponding to the next request expected for that file.
   * This allows the helper to wait for multiple concurrent requests to the same
   * asset without losing track of older ones.
   * @param {string} fileName
   */
  function markRequestAsSeen(fileName) {
    const currentCount = waitingRequestCounts.get(fileName) ?? 0;
    if (currentCount <= 1) {
      waitingRequestCounts.delete(fileName);
      requestPromises.delete(fileName);
      const resolver = requestResolvers.get(fileName);
      requestResolvers.delete(fileName);
      resolver?.();
      return;
    }

    waitingRequestCounts.set(fileName, currentCount - 1);
    const resolver = requestResolvers.get(fileName);
    requestPromises.set(
      fileName,
      new Promise((resolve) => {
        requestResolvers.set(fileName, resolve);
      }),
    );
    resolver?.();
  }

  /**
   * Return a promise resolved when the next request for that file reaches `send`.
   * Each call waits for one request, even if several requests for the same asset
   * are fired concurrently.
   * @param {string} fileName
   * @returns {Promise<void>}
   */
  function waitForNthRequest(fileName) {
    const currentCount = waitingRequestCounts.get(fileName) ?? 0;
    waitingRequestCounts.set(fileName, currentCount + 1);
    if (!requestPromises.has(fileName)) {
      requestPromises.set(
        fileName,
        new Promise((resolve) => {
          requestResolvers.set(fileName, resolve);
        }),
      );
    }
    return requestPromises.get(fileName);
  }

  XMLHttpRequest.prototype.send = function send(body) {
    const xhr = /** @type {XMLHttpRequest & { __thumbnailTestUrl?: string }} */ (this);
    const requestUrl =
      typeof xhr.__thumbnailTestUrl === "string" ? xhr.__thumbnailTestUrl : "";
    const matchingFileName = [...waitingFileNames].find((fileName) =>
      requestUrl.includes(fileName),
    );
    if (matchingFileName === undefined) {
      return nativeSend.call(xhr, body);
    }

    const delayedRequestsForFile = delayedRequests.get(matchingFileName) ?? [];
    delayedRequestsForFile.push({
      xhr,
      body,
    });
    delayedRequests.set(matchingFileName, delayedRequestsForFile);
    markRequestAsSeen(matchingFileName);
  };

  return {
    /**
     * Release the oldest delayed request for that file.
     * Releasing in FIFO order keeps the helper deterministic when multiple
     * requests for the same asset are waiting at once.
     * @param {string} fileName
     */
    release(fileName) {
      const delayedRequestsForFile = delayedRequests.get(fileName);
      expect(delayedRequestsForFile).toBeDefined();
      expect(delayedRequestsForFile.length).toBeGreaterThan(0);
      const delayedRequest = delayedRequestsForFile.shift();
      expect(delayedRequest).toBeDefined();
      if (delayedRequestsForFile.length === 0) {
        delayedRequests.delete(fileName);
        waitingFileNames.delete(fileName);
      }
      nativeSend.call(delayedRequest.xhr, delayedRequest.body);
    },
    /**
     * Wait until the next delayed request for that file has been intercepted.
     * @param {string} fileName
     * @returns {Promise<void>}
     */
    async waitForRequest(fileName) {
      await waitForNthRequest(fileName);
    },
    restore() {
      XMLHttpRequest.prototype.open = nativeOpen;
      XMLHttpRequest.prototype.send = nativeSend;
    },
  };
}

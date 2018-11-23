import launchTestsForContent from "../launch_tests_for_content.js";
import {
  manifestInfos as segmentTimelineManifestInfos,
  URLs as segmentTimelineURLs,
} from "../../contents/DASH_static_SegmentTimeline";
import {
  manifestInfos as segmentBaseManifestInfos,
  URLs as segmentBaseURLs,
} from "../../contents/DASH_static_SegmentBase_multi_codecs";

describe("DASH non-linear content (SegmentTimeline)", function () {
  launchTestsForContent(segmentTimelineURLs, segmentTimelineManifestInfos);
});

describe("DASH non-linear content multi-codecs (SegmentBase)", function () {
  launchTestsForContent(segmentBaseURLs, segmentBaseManifestInfos);
});

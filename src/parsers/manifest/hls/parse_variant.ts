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

import log from "../../../log";
import { normalizeBaseURL } from "../../../utils/resolve_url";
import { IParsedAdaptationType, IParsedRepresentation } from "../types";
import categorizeCodecs from "./categorize_codecs";
import { IXStreamInf } from "./createMasterPlaylistIR";
import createMediaPlaylistIR from "./createMediaPlaylistIR";
import guessMimeType from "./guess_mime_type";
import HLSRepresentationIndex from "./representation_index";

export type ICodecToGroupID = Partial<
  Record<
    IParsedAdaptationType,
    Partial<
      Record<
        string, // group id
        string /* codec */
      >
    >
  >
>;

export interface IVariantContext {
  // Object to store codec information from the Variant, to be used when parsing
  // the corresponding media
  codecToGroupIDMap: ICodecToGroupID;

  // Default Media Playlist for the variant
  requestData: string;

  // URL for the Media Playlist response
  requestURL: string | undefined;

  // ID the corresponding Representation should have
  wantedID: string;
}

export default function parseVariant(
  variant: IXStreamInf,
  { codecToGroupIDMap, requestData, requestURL, wantedID }: IVariantContext,
): IParsedRepresentation | null {
  if (variant.defaultURI === undefined) {
    return null;
  }
  const mediaPlaylistURL =
    requestURL === undefined
      ? normalizeBaseURL(variant.defaultURI)
      : normalizeBaseURL(requestURL);
  const mediaPlaylist = createMediaPlaylistIR(requestData);
  const {
    endList,
    initSegment: initSegmentInfo,
    segments,
    mediaSequence,
  } = mediaPlaylist;
  const isVoD = mediaPlaylist.playlistType === "VOD";

  const codecsPerType =
    variant.codecs === undefined ? {} : categorizeCodecs(variant.codecs);

  if (variant.videoGroup !== undefined && codecsPerType.video !== undefined) {
    if (codecToGroupIDMap.video === undefined) {
      codecToGroupIDMap.video = { [variant.videoGroup]: codecsPerType.video };
    } else if (codecToGroupIDMap.video[variant.videoGroup] === undefined) {
      codecToGroupIDMap.video[variant.videoGroup] = codecsPerType.video;
    } else if (codecToGroupIDMap.video[variant.videoGroup] !== codecsPerType.video) {
      log.warn("HLS Parser: discordant info for the video codec");
    }
  }

  if (variant.audioGroup !== undefined && codecsPerType.audio !== undefined) {
    if (codecToGroupIDMap.audio === undefined) {
      codecToGroupIDMap.audio = { [variant.audioGroup]: codecsPerType.audio };
    } else if (codecToGroupIDMap.audio[variant.audioGroup] === undefined) {
      codecToGroupIDMap.audio[variant.audioGroup] = codecsPerType.audio;
    } else if (codecToGroupIDMap.audio[variant.audioGroup] !== codecsPerType.audio) {
      log.warn("HLS Parser: discordant info for the audio codec");
    }
  }

  if (variant.subtitlesGroup !== undefined && codecsPerType.text !== undefined) {
    if (codecToGroupIDMap.text === undefined) {
      codecToGroupIDMap.text = { [variant.subtitlesGroup]: codecsPerType.text };
    } else if (codecToGroupIDMap.text[variant.subtitlesGroup] === undefined) {
      codecToGroupIDMap.text[variant.subtitlesGroup] = codecsPerType.text;
    } else if (codecToGroupIDMap.text[variant.subtitlesGroup] !== codecsPerType.text) {
      log.warn("HLS Parser: discordant info for the text codec");
    }
  }

  const index = new HLSRepresentationIndex({
    endList,
    initSegmentInfo,
    isVoD,
    mediaPlaylistURL,
    mediaSequence,
    segments,
  });

  return {
    id: wantedID,
    bitrate: variant.bandwidth, // XXX TODO
    index,
    codecs: codecsPerType.video,
    mimeType: guessMimeType("video", mediaPlaylist),
    height: variant.height,
    width: variant.width,
    frameRate: variant.frameRate,
  };
}

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

import { ICustomError } from "../../errors";
import {
  IAdaptation,
  IManifest,
  IPeriod,
  IRepresentation,
} from "../../manifest";
import {
  IAttachedMediaKeysEvent,
  IBlacklistProtectionDataEvent,
  ICreatedMediaKeysEvent,
  IEncryptedEvent,
  IInitDataIgnoredEvent,
  IKeysUpdateEvent,
  INoUpdateEvent,
  ISessionMessageEvent,
  ISessionUpdatedEvent,
} from "../eme";
import SegmentBuffersStore from "../segment_buffers";
import {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IBitrateEstimationChangeEvent,
  ICompletedStreamEvent,
  IEncryptionDataEncounteredEvent,
  IInbandEventsEvent,
  INeedsBufferFlushEvent,
  INeedsDecipherabilityFlush,
  INeedsMediaSourceReload,
  IPeriodStreamClearedEvent,
  IPeriodStreamReadyEvent,
  IRepresentationChangeEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsManifestRefresh,
} from "../stream";
import { IEMEDisabledEvent } from "./create_eme_manager";
import {
  IStreamEventEvent,
  IStreamEventSkipEvent,
} from "./stream_events_emitter";

/** Event sent after the Manifest has been loaded and parsed for the first time. */
export interface IManifestReadyEvent {
  type : "manifestReady";
  value : {
    /** The Manifest we just parsed. */
    manifest : IManifest;
  };
}

/** Event sent after the Manifest has been updated. */
export interface IManifestUpdateEvent { type: "manifestUpdate";
                                        value: null; }

/**
 * Event sent after updating the decipherability status of at least one
 * Manifest's Representation.
 * This generally means that some Representation(s) were detected to be
 * undecipherable on the current device.
 */
export interface IDecipherabilityUpdateEvent {
  type: "decipherabilityUpdate";
  value: Array<{ manifest : IManifest;
                 period : IPeriod;
                 adaptation : IAdaptation;
                 representation : IRepresentation; }>; }

/** Event sent when a minor happened. */
export interface IWarningEvent { type : "warning";
                                 value : ICustomError; }

/**
 * Event sent when we're starting attach a new MediaSource to the media element
 * (after removing the previous one).
 */
export interface IReloadingMediaSourceEvent { type: "reloading-media-source";
                                              value: undefined; }

/** Event sent after the player stalled. */
export interface IStalledEvent {
  type : "stalled";
  /** The reason behind the stall */
  value : IStallingSituation;
}

export type IStallingSituation =
  "seeking" | // Rebuffering after seeking
  "not-ready" | // Rebuffering after low ready state
  "internal-seek" | // Rebuffering after a seek happened inside the player
  "buffering" | // Other rebuffering cases
  "freezing"; // stalled for an unknown reason (might be waiting for
              // a decryption key)

/** Event sent when the player goes out of a stalling situation. */
export interface IUnstalledEvent { type : "unstalled";
                                   value : null; }

/**
 * Event sent just as the content is considered as "loaded".
 * From this point on, the user can reliably play/pause/resume the stream.
 */
export interface ILoadedEvent { type : "loaded";
                                value : {
                                  segmentBuffersStore: SegmentBuffersStore | null;
                                }; }

export { IRepresentationChangeEvent };

/** Events emitted by a `MediaSourceLoader`. */
export type IMediaSourceLoaderEvent = IStalledEvent |
                                      IUnstalledEvent |
                                      ILoadedEvent |
                                      IWarningEvent |
                                      IStreamEventEvent |
                                      IStreamEventSkipEvent |

                                      // Coming from the StreamOrchestrator

                                      IActivePeriodChangedEvent |
                                      IPeriodStreamClearedEvent |
                                      ICompletedStreamEvent |
                                      IPeriodStreamReadyEvent |
                                      INeedsMediaSourceReload |
                                      INeedsBufferFlushEvent |
                                      IAdaptationChangeEvent |
                                      IBitrateEstimationChangeEvent |
                                      INeedsDecipherabilityFlush |
                                      IRepresentationChangeEvent |
                                      IStreamEventAddedSegment<unknown> |
                                      IEncryptionDataEncounteredEvent |
                                      IStreamManifestMightBeOutOfSync |
                                      IStreamNeedsManifestRefresh |
                                      IInbandEventsEvent;

/** Every events emitted by the `Init` module. */
export type IInitEvent = IManifestReadyEvent |
                         IManifestUpdateEvent |
                         IReloadingMediaSourceEvent |
                         IDecipherabilityUpdateEvent |
                         IWarningEvent |
                         IEMEDisabledEvent |

                         // Coming from the `EMEManager`

                         IEncryptedEvent |
                         ICreatedMediaKeysEvent |
                         IAttachedMediaKeysEvent |
                         IInitDataIgnoredEvent |
                         ISessionMessageEvent |
                         IKeysUpdateEvent |
                         INoUpdateEvent |
                         ISessionUpdatedEvent |
                         IBlacklistProtectionDataEvent |

                         // Coming from the `MediaSourceLoader`

                         IStalledEvent |
                         IUnstalledEvent |
                         ILoadedEvent |
                         IStreamEventEvent |
                         IStreamEventSkipEvent |

                         // Coming from the `StreamOrchestrator`

                         IActivePeriodChangedEvent |
                         IPeriodStreamClearedEvent |
                         ICompletedStreamEvent |
                         IPeriodStreamReadyEvent |
                         IAdaptationChangeEvent |
                         IBitrateEstimationChangeEvent |
                         IRepresentationChangeEvent |
                         IStreamEventAddedSegment<unknown> |
                         IInbandEventsEvent;

/** Events emitted by the `Init` module for directfile contents. */
export type IDirectfileEvent = IStalledEvent |
                               IUnstalledEvent |
                               ILoadedEvent |
                               IWarningEvent |
                               IEMEDisabledEvent |

                               // Coming from the `EMEManager`

                               IEncryptedEvent |
                               ICreatedMediaKeysEvent |
                               IAttachedMediaKeysEvent |
                               IInitDataIgnoredEvent |
                               ISessionMessageEvent |
                               IKeysUpdateEvent |
                               INoUpdateEvent |
                               ISessionUpdatedEvent |
                               IBlacklistProtectionDataEvent;

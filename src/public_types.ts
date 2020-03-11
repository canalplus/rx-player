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

/**
 * This file exports types we want to expose to library users.
 * Those types are considered as part of the API.
 */

export {
  IConstructorOptions,
  ILoadVideoOptions,

  // loadVideo arguments:
  ITransportOptions,
  IKeySystemOption,
  ISupplementaryTextTrackOption,
  ISupplementaryImageTrackOption,
  IDefaultAudioTrackOption,
  IDefaultTextTrackOption,
  INetworkConfigOption,
  IStartAtOption,

  ITMAudioTrackListItem as IAvailableAudioTrack,
  ITMTextTrackListItem as IAvailableTextTrack,
  ITMVideoTrackListItem as IAvailableVideoTrack,

  ITMAudioTrack as IAudioTrack,
  ITMTextTrack as ITextTrack,
  ITMVideoTrack as IVideoTrack,

  IAudioTrackPreference,
  ITextTrackPreference,
} from "./core/api";

# RxPlayer types

Several of RxPlayer TypeScript types  have been removed, renamed or updated.

They are all listed here.


## `IPersistentSessionStorage`

`IPersistentSessionStorage` has been renamed `IPersistentLicenseConfig` to
replicate the renaming of the `licenseStorage` option into the
`persistentLicenseConfig` option.


## `ISupplementaryTextTrackOption`

The `ISupplementaryTextTrackOption` type has been removed because the
corresponding `supplementaryTextTracks` option has been removed.


## `ISupplementaryImageTrackOption`

The `ISupplementaryImageTrackOption` type has been removed because the
corresponding `supplementaryImageTracks` option has been removed.


## `IBitrateEstimate`

The `IBitrateEstimate` type has been removed as the corresponding
`bitrateEstimationChange` event has been removed.


## `IManifest` / `IPeriod` / `IAdaptation` / `IRepresentation`

All those types have been removed because corresponding API now return more
specialized types.


## `IRepresentationInfos`

The `IRepresentationInfos` type has been renamed `IRepresentationContext`
(the second argument for the `representationFilter` API).


## `IBifThumbnail` / `IBifObject`

Both types have now to be imported from the
[`parseBifThumbnails`](../../api/Tools/parseBifThumbnails.md) tool's path
instead.


## `IExposedSegment`

The `IExposedSegment` type has been removed as no API depends on it anymore.


## `IAudioTrackPreference` / `ITextTrackPreference` / `IVideoTrackPreference`

The `IAudioTrackPreference`, `ITextTrackPreference` and `IVideoTrackPreference`
public types have been removed as the corresponding API do not exist anymore.


## `IDefaultAudioTrackOption` / `IDefaultTextTrackOption`

Both types have been removed because the corresponding `defaultAudioTrack` and
`defaultTextTrack` options also have been removed.

### Probed APIS

- __mediaCapabilities__ - Chrome >= 64 (https://github.com/WICG/media-capabilities)
  - Check for decoding capabilites from video and audio attributes.

- __isTypeSupportedWithFeatures__ - Microsoft EDGE
  - Check for DRM support + decoding and displaying capabilites from video, audio, display and media protection configuration.

- __isTypeSupported__ - Chrome >= 31 / Firefox >= 41 / EDGE / IE >= 11 / Safari >= 8
(https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported)
  - Check for video and audio decoding support from content type.

- __matchMedia__ (with color gamut support) - Chrome >= 58.
  - Check for color space support.

- __requestMediaKeySystemAccess__ - Chrome >= 42 / Firefox / EDGE / Safari
(https://developer.mozilla.org/fr/docs/Web/API/Navigator/requestMediaKeySystemAccess)
  - Check for DRM support.

- __getStatusForPolicy__ - ?
(https://github.com/WICG/media-capabilities/blob/master/eme-extension-policy-check.md)
  - Query a hypothetical status associated with an HDCP policy.
# Stream Restriction Manager

The StreamRestrictionManager manages all kind of restrictions that can prevent or degrade content playback.
It provides a record of representations that are in the current manifest. Some traits are associated with each
of the streams. For each trait, the manager knows if playback is authorized or not. The manager relies on
these traits:

- KeyID: HDCP (High-Bandwidth Digital Content Protection) is a digital copy protection meant to stop HDCP-encrypted content from being played on unauthorized devices. Some licences enforce HDCP restriction. 
A keyID is associated to each ciphered stream. The process for getting a playback licence relies on the keyID of the content. If a licence enforce HDCP and output device is unauthorized, the browser CDM notify the user
that current content (associated to a KeyID) may not play correctly on the current device. So manager notifies that output is restricted for corresponding representation. This one will not be played.
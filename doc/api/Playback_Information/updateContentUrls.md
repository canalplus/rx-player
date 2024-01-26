# updateContentUrls

## Description

Update URL of the content currently being played (e.g. of DASH's MPD),
optionally also allowing to request an immediate refresh of it.

This method can for example be called when you would prefer that the content and
its associated resources to be reached through another URL than what has been
used until now.

Note that if a request through one of the given URL lead to a HTTP redirect, the
RxPlayer will generally prefer the redirected URL over the URL explicitely
communicated (to prevent more HTTP redirect).

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.updateContentUrls(urls);
// or
player.updateContentUrls(urls, params);
```

- **arguments**:

  1.  _urls_ `Array.<string>|under`: URLs to reach that content / Manifest
      from the most prioritized URL to the least prioritized URL.

  2.  _params_ `Object|undefined`: Optional parameters linked to this URL
      change.

  Can contain the following properties:

  - _refresh_ `boolean`: If `true` the resource in question (e.g.
    DASH's MPD) will be refreshed immediately.

## Examples

```js
// Update with only one URL
player.updateContentUrls(["http://my.new.url"]);

// Update with multiple URLs
player.updateContentUrls(["http://more.prioritized.url", "http://less.prioritized.url"]);

// Set no URL (only is useful in some very specific situations, like for content
// with no Manifest refresh or when a `manifestLoader` is set).
player.updateContentUrls(undefined);

// Update and ask to refresh immediately
player.updateContentUrls(["http://my.new.url"], { refresh: true });
```

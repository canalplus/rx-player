The Manifest looked like this before this commit:

```ts
type Manifest = {
  periods: Array<{
    // Define a particular track
    adaptations: Record<
      "audio" | "video" | "text",
      Array<{
        // qualities
        representations: Array<{
          // ... That Representation's metadata
        }>;
        // ... The rest of that track's metadata
      }>
    >;
    // ... The rest of that Period's metadata
  }>;
  // ... The rest of the Manifest's metadata
};
```

Now it looks like:

```ts
type Manifest = {
  periods: Array<{
    tracksMetadata: Record<
      "audio" | "video" | "text",
      Record<
        string, // The track's id
        {
          // All qualities linked to that track
          representations: Record<
            string, // That Representation's id
            {
              // ... That Representation's metadata
            }
          >;
          // ... The rest of that track's metadata
        }
      >
    >;

    // Groups of available tracks and qualities combinations
    variantStreams: Array<{
      id: string;
      // bandwidth for that variant, only defined for HLS, others have
      // only a single variant
      bandwidth: number | undefined;
      // Authorized tracks + qualities combinations in that variantStream
      media: Record<
        "audio" | "video" | "text",
        Array<{
          // `id` the corresponding track in `tracksMetadata`
          linkedTrackId: string;
          // `id` list of the Representations' in `tracksMetadata`
          representations: string[];
        }>
      >;
    }>;
    // ... The rest of that Period's metadata
  }>;
  // ... The rest of the Manifest's metadata
};
```

So basically in a Period, we'll now separate a tracks' metadata and the conditions in
which we may play them: the former rely on `tracksMetadata`, the latter on
`variantStreams`.

Note that `variantStreams` only use `id`s to refer to tracks and Representations: it does
not contain the metadata directly. This is to avoid having to repeat a track's and
representation's metadata already present in the `tracksMetadata`. We cannot just rely on
a same-object-reference trick because the Manifest object has to be able to be transmitted
through the worker and main tread. Worker compatibility is also the main reason why we're
not relyng on `Map` objects to link ids and metadata, though it may seem more logical.

This new structure allows to enforce complex HLS features, like restrictions on which
tracks and qualities can be played when another unrelated track is selected. Here
incompatible tracks would never be present the same variantStream.

Though it is very clear that it adds net complexity on top of our Manifest's structure, as
those "variant streams" concept do not exist in Smooth or DASH. For Smooth and DASH, only
a single `variantStream` will be present, with a `bandwidth` set to `undefined`
(Representation-level `bandwidth` is still exploited by our ABR logic) and containing all
tracks declared in `tracksMetadata`.

import { describe, it, expect, vi } from "vitest";
import TextTrackCuesStore from "../text_track_cues_store";
import type { ICuesGroup } from "../utils";

/**
 * Mocks document.createElement to simplify comparison of cuesElement by returning
 * a plain object with innerText property instead of an HTMLElement.
 * @param text innerText
 * @returns
 */
function mockCreateElementFn() {
  vi.spyOn(document, "createElement").mockImplementation(
    (n: string) => ({ innerText: n }) as HTMLElement,
  );

  return (text: string) => document.createElement(text);
}

describe("TextTrackCuesStore - insert()", () => {
  const createCueElement = mockCreateElementFn();

  it("test the mock function, a and b should be considered different", () => {
    const a = createCueElement("hello");
    const b = createCueElement("bye");
    expect(a).not.toEqual(b);
    expect(a.innerText).toEqual("hello");
  });

  it("inserting strictly after previous one", () => {
    //   ours:                  |AAAAA|
    //   the current one: |BBBBB|
    //   Result:          |BBBBB|AAAAA|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("bye"), start: 1, end: 2 }],
        start: 1,
        end: 2,
      },
    ];

    // small hack to access class private property with bracket notation without having ts errors
    /* eslint-disable @typescript-eslint/dot-notation */
    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("bye"), start: 1, end: 2 }],
      1,
      2,
    );

    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("inserting strictly before existing cue", () => {
    //   ours:            |AAAAA|
    //   the current one:       |BBBBB|
    //   Result:          |AAAAA|BBBBB|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("bye"), start: 1, end: 2 }],
        start: 1,
        end: 2,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("bye"), start: 1, end: 2 }],
        start: 1,
        end: 2,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("hello"), start: 0, end: 1 }],
      0,
      1,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("inserting between two cues", () => {
    //   ours:                  |AAAAA|
    //   the current one: |BBBBB|     |BBBBB|
    //   Result:          |BBBBB|AAAAA|BBBBB|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("hello again"), start: 2, end: 3 }],
        start: 2,
        end: 3,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("bye"), start: 1, end: 2 }],
        start: 1,
        end: 2,
      },
      {
        cues: [{ element: createCueElement("hello again"), start: 2, end: 3 }],
        start: 2,
        end: 3,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("bye"), start: 1, end: 2 }],
      1,
      2,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("replacing current cues", () => {
    //   ours:            |AAAAA|
    //   the current one: |BBBBB|
    //   Result:          |AAAAA|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hello"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("hi"), start: 0, end: 1 }],
      0,
      1,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("inserting cues that partially replace existing cues", () => {
    //   ours:            |AAAAA|
    //   the current one: |BBBBBBBB|
    //   Result:          |AAAAABBB|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("how are you?"), start: 0, end: 2 }],
        start: 0,
        end: 2,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("how are you?"), start: 0, end: 2 }],
        start: 1,
        end: 2,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("hi"), start: 0, end: 1 }],
      0,
      1,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });
  it("inserting cues that replace existing cues and go beyond", () => {
    //   ours:            |AAAAAAA|
    //   the current one: |BBBB|...
    //   Result:          |AAAAAAA|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 0, end: 1 }],
        start: 0,
        end: 1,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("how are you?"), start: 0, end: 2 }],
        start: 0,
        end: 2,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("how are you?"), start: 0, end: 2 }],
      0,
      2,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("inserting after previous one with parsing approximation", () => {
    //   ours:                  |AAAAA|
    //   the current one: |BBBBB|
    //   Result:          |BBBBB|AAAAA|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 0, end: 1.0001 }],
        start: 0,
        end: 1.0001,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 0, end: 1.0001 }],
        start: 0,
        end: 1,
      },
      {
        cues: [{ element: createCueElement("how are you?"), start: 1, end: 2 }],
        start: 1,
        end: 2,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("how are you?"), start: 1, end: 2 }],
      1,
      2,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });

  it("inserting cues that replace existing cues and go beyond with parsing approximation", () => {
    //   ours:            |AAAAAAA|
    //   the current one: |BBBB|...
    //   Result:          |AAAAAAA|
    const textTrackCuesStore = new TextTrackCuesStore();
    const currentCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 9.8, end: 10.001 }],
        start: 9.8,
        end: 10.001,
      },
    ];

    const expectedCues: ICuesGroup[] = [
      {
        cues: [{ element: createCueElement("hi"), start: 9.8, end: 10.001 }],
        start: 9.8,
        end: 10,
      },
      {
        cues: [{ element: createCueElement("hi"), start: 10, end: 12 }],
        start: 10,
        end: 12,
      },
    ];

    textTrackCuesStore["_cuesBuffer"] = currentCues;
    textTrackCuesStore.insert(
      [{ element: createCueElement("hi"), start: 10, end: 12 }],
      10,
      12,
    );
    expect(textTrackCuesStore["_cuesBuffer"]).toEqual(expectedCues);
  });
});

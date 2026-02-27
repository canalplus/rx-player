import { describe, it, expect } from "vitest";
import addClassName from "../add_class_name";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

function makeElementWithoutClassList(className: string): HTMLElement {
  return { className } as unknown as HTMLElement;
}

function makeElementWithClassList(initialClasses: string[] = []): HTMLElement {
  const classes = new Set(initialClasses);
  return {
    className: [...classes].join(" "),
    classList: {
      get() {
        return classes;
      },
      add: (cls: string) => {
        classes.add(cls);
      },
    },
  } as unknown as HTMLElement;
}

describe("addClassName", () => {
  describe("when classList API is available", () => {
    it("adds a class to an element", () => {
      const elt = makeElementWithClassList();
      addClassName(elt, "foo");
      expect((elt.classList as any).get()).toContain("foo");
    });
  });

  describe("when classList API is unavailable", () => {
    it("adds a class to an element that has no existing className", () => {
      const elt = makeElementWithoutClassList("");
      addClassName(elt, "foo");
      expect(elt.className).toContain("foo");
    });

    it("adds a class to an element that already has other classes", () => {
      const elt = makeElementWithoutClassList("bar");
      addClassName(elt, "foo");
      expect(elt.className).toContain("foo");
      expect(elt.className).toContain("bar");
    });

    it("does not add the class again if it is already present", () => {
      const elt = makeElementWithoutClassList("foo bar");
      addClassName(elt, "foo");
      const count = elt.className.split(" ").filter((c) => c === "foo").length;
      expect(count).toBe(1);
    });

    it("does not mistake a substring for a full class match", () => {
      const elt = makeElementWithoutClassList("foobar");
      addClassName(elt, "foo");
      expect(elt.className).toContain("foo");
      // "foo" should have been appended, not considered already present
      const parts = elt.className.split(" ");
      expect(parts).toContain("foo");
      expect(parts).toContain("foobar");
    });
  });
});

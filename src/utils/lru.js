/**
 * A doubly linked list-based Least Recently Used (LRU) cache. Will
 * keep most recently used items while discarding least recently used
 * items when its limit is reached.
 *
 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson
 * <http://hunch.se/> See README.md for details.
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.newer => |      |.newer => |      |.newer => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
class LRUCache {
  constructor(limit) {
    this.size = 0;
    this.limit = limit;
    this._keymap = {};
    this.head = null;
    this.tail = null;
  }

  set(key, value) {
    const entry = {
      key,
      value,
      newer: null,
      older: null,
    };

    this._keymap[key] = entry;

    if (this.tail) {
      this.tail.newer = entry;
      entry.older = this.tail;
    } else {
      this.head = entry;
    }

    this.tail = entry;

    if (this.size === this.limit) {
      return this.shift();
    } else {
      this.size++;
      return null;
    }
  }

  shift() {
    const entry = this.head;
    if (entry) {
      if (this.head.newer) {
        this.head = this.head.newer;
        this.head.older = null;
      } else {
        this.head = null;
      }
      entry.newer = entry.older = null;
      delete this._keymap[entry.key];
    }

    return entry;
  }

  get(key) {
    const entry = this._keymap[key];
    if (entry == null) {
      return;
    }

    if (entry === this.tail) {
      return entry.value;
    }

    if (entry.newer) {
      if (entry === this.head) {
        this.head = entry.newer;
      }
      entry.newer.older = entry.older;
    }
    if (entry.older) {
      entry.older.newer = entry.newer;
    }

    entry.newer = null;
    entry.older = this.tail;

    if (this.tail) {
      this.tail.newer = entry;
    }

    this.tail = entry;
    return entry.value;
  }
}

module.exports = LRUCache;

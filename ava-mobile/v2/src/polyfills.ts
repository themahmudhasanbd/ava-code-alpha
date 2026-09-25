/**
 * Universal runtime polyfills for React Native / Hermes in AvA Mobile v2.
 * Ensures Web Crypto API, randomUUID, and global environments are safely initialized.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const global: any;

const g: any =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof global !== "undefined"
    ? global
    : typeof window !== "undefined"
    ? window
    : {};

// Ensure crypto exists on global scope
if (typeof g.crypto === "undefined" || !g.crypto) {
  g.crypto = {};
}

// Polyfill crypto.randomUUID (RFC4122 v4 compliant)
if (typeof g.crypto.randomUUID !== "function") {
  g.crypto.randomUUID = function randomUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

// Polyfill crypto.getRandomValues
if (typeof g.crypto.getRandomValues !== "function") {
  g.crypto.getRandomValues = function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (array) {
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  };
}

// Mirror to global if separate
if (typeof global !== "undefined" && global !== g) {
  global.crypto = g.crypto;
}

export {};

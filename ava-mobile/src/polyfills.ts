/**
 * Universal runtime polyfills for React Native / Hermes in AvA Mobile v2.
 * Ensures Web Crypto API, randomUUID, global environments, and dynamic theme stylesheets are safely initialized.
 */

import { patchStyleSheet } from "@/theme/style-registry";

// Intercept and register all StyleSheet.create calls for seamless live theme swapping
patchStyleSheet();

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

// Inject continuous spinner CSS keyframes for Web environments
if (typeof document !== "undefined" && typeof document.createElement === "function") {
  try {
    const styleId = "ava-universal-spinner-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes r-animation-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ava-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        [role="progressbar"] svg,
        [role="progressbar"] > div,
        .r-animation-spin,
        .r-animation-spin-1,
        .animate-spin {
          animation: r-animation-spin 0.85s linear infinite !important;
          transform-origin: center center !important;
        }
      `;
      document.head.appendChild(style);
    }
  } catch {
    // ignore
  }
}

export {};

import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeInput } from "../src/input/normalize-input.js";

const pair = {
  productId: "example-product",
  name: "Example App",
  googlePlayAppId: "com.example.app",
  googlePlayUrl: "https://play.google.com/store/apps/details?id=com.url.app",
  appleAppId: "123456789",
  appleAppStoreUrl: "https://apps.apple.com/us/app/example/id987654321",
};

test("normalizes explicit product identity and gives IDs precedence over URLs", () => {
  const input = normalizeInput({
    mode: "comparePlatforms",
    products: [pair],
    countries: ["us", "vn"],
    languages: ["en", "vi"],
  });

  assert.deepEqual(input.products[0], {
    productId: "example-product",
    name: "Example App",
    productType: "mobileApp",
    platforms: {
      googlePlay: {
        appId: "com.example.app",
        storeUrl: "https://play.google.com/store/apps/details?id=com.url.app",
      },
      appleAppStore: {
        appId: "123456789",
        storeUrl: "https://apps.apple.com/us/app/example/id987654321",
      },
    },
    releases: { android: null, ios: null },
  });
  assert.deepEqual(input.countries, ["US", "VN"]);
  assert.deepEqual(input.languages, ["en", "vi"]);
});

test("allows one-platform raw collection but requires both platforms for comparison", () => {
  const onePlatform = normalizeInput({
    mode: "rawReviews",
    products: [
      { productId: "android-only", googlePlayAppId: "com.example.app" },
    ],
  });
  assert.equal(onePlatform.products[0].platforms.appleAppStore, undefined);
  assert.throws(
    () =>
      normalizeInput({
        mode: "comparePlatforms",
        products: [
          { productId: "android-only", googlePlayAppId: "com.example.app" },
        ],
      }),
    /MISSING_PLATFORM_FOR_COMPARISON/,
  );
});

test("rejects duplicate platform IDs across product mappings", () => {
  assert.throws(
    () =>
      normalizeInput({
        mode: "rawReviews",
        products: [
          { productId: "one", googlePlayAppId: "com.same.app" },
          { productId: "two", googlePlayAppId: "com.same.app" },
        ],
      }),
    /DUPLICATE_PLATFORM_APP/,
  );
});

test("validates release comparison metadata separately for Android and iOS", () => {
  const input = normalizeInput({
    mode: "releaseComparison",
    products: [
      {
        ...pair,
        releases: {
          android: { version: "4.2.0", releasedAt: "2026-07-20" },
          ios: { version: "4.2.0", releasedAt: "2026-07-22T00:00:00Z" },
        },
      },
    ],
    daysBefore: 14,
    daysAfter: 14,
  });

  assert.equal(
    input.products[0].releases.android.releasedAt,
    "2026-07-20T00:00:00.000Z",
  );
  assert.equal(
    input.products[0].releases.ios.releasedAt,
    "2026-07-22T00:00:00.000Z",
  );
  assert.throws(
    () =>
      normalizeInput({
        mode: "releaseComparison",
        products: [
          { ...pair, releases: { android: { releasedAt: "2026-07-20" } } },
        ],
      }),
    /INVALID_RELEASE_COMPARISON/,
  );
});

test("rejects invalid modes and malformed source identifiers", () => {
  assert.throws(
    () => normalizeInput({ mode: "unknown", products: [pair] }),
    /UNSUPPORTED_MODE/,
  );
  assert.throws(
    () =>
      normalizeInput({
        mode: "rawReviews",
        products: [{ productId: "bad", googlePlayAppId: "not valid" }],
      }),
    /INVALID_GOOGLE_PLAY_ID/,
  );
  assert.throws(
    () =>
      normalizeInput({
        mode: "rawReviews",
        products: [{ productId: "bad", appleAppId: "not-numeric" }],
      }),
    /INVALID_APP_STORE_ID/,
  );
});

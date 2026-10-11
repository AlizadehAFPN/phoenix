import { defineConfig } from "@playwright/test";

/**
 * The layout suite: the production build, in all three engines, at every
 * screen size the page has to hold at.
 *
 *   npm run build            # local only: the suite runs the real output
 *   npm run test:e2e
 *
 * Chromium stands for Chrome, Edge and Android; WebKit for Safari on the Mac,
 * the iPad and the iPhone; Firefox for itself. Sizes are CSS pixels, chosen
 * at the edges: the smallest phone still sold, a phone on its side, an iPad
 * both ways, a 13-inch laptop with Safari's toolbars showing, a 1080p screen.
 *
 * What emulation cannot reproduce is a phone's toolbar sliding away; the
 * stage is sized to the small viewport (`100svh`) so that case holds by
 * construction, and the owner's real-device pass covers it (BRIEF §8.9).
 */

const PORT = 3200;
/* E2E_BASE_URL points the suite at a server that is already running —
   used to run Firefox from a Linux container against this Mac's server. */
const EXTERNAL = process.env.E2E_BASE_URL;

const VIEWPORTS = [
  { name: "android-small", width: 360, height: 780, dpr: 3, mobile: true },
  { name: "phone-se", width: 375, height: 667, dpr: 2, mobile: true },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
  { name: "android", width: 412, height: 915, dpr: 2.625, mobile: true },
  { name: "phone-landscape", width: 844, height: 390, dpr: 3, mobile: true },
  { name: "ipad-portrait", width: 820, height: 1180, dpr: 2, mobile: true },
  { name: "ipad-landscape", width: 1180, height: 820, dpr: 2, mobile: true },
  { name: "laptop-short", width: 1280, height: 620, dpr: 2, mobile: false },
  /* The owner's MacBook in Safari, measured from his screenshot. */
  { name: "laptop-safari", width: 1440, height: 716, dpr: 2, mobile: false },
  { name: "laptop", width: 1440, height: 790, dpr: 2, mobile: false },
  { name: "desktop", width: 1920, height: 1080, dpr: 1, mobile: false },
] as const;

/* Firefox is opt-in (E2E_FIREFOX=1): the Firefox build Playwright ships
   cannot start on macOS 27 ("Could not find profile folder", even run by
   hand), so it runs where it can, on Linux. */
const BROWSERS = [
  "chromium",
  "webkit",
  ...(process.env.E2E_FIREFOX === "1" ? (["firefox"] as const) : []),
] as const;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  timeout: 180_000,
  fullyParallel: true,
  workers: 3,
  reporter: [["list"]],
  use: {
    baseURL: EXTERNAL ?? `http://localhost:${String(PORT)}`,
    /* Light, like a Mac in its default appearance: anything that still
       follows the system's mode shows up here. */
    colorScheme: "light",
  },
  ...(EXTERNAL === undefined
    ? {
        webServer: {
          command: `npx next start -p ${String(PORT)}`,
          url: `http://localhost:${String(PORT)}`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
  projects: BROWSERS.flatMap((browserName) =>
    VIEWPORTS.map((vp) => ({
      name: `${browserName}-${vp.name}`,
      use: {
        browserName,
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        /* Firefox does not emulate mobile viewports. */
        isMobile: browserName !== "firefox" && vp.mobile,
        hasTouch: vp.mobile,
      },
    })),
  ),
});

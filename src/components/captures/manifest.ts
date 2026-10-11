/**
 * The capture slots (BRIEF §1: captures come at the end of the build; until
 * then every slot is a neutral frame).
 *
 * To fill a slot, drop the simulator screenshot under `public/captures/` and
 * set its `src`. Every frame is checked against BRIEF §2.4 before it goes in:
 * no template logo, no Kish Air livery, no fixture content in frame, no
 * unlicensed art. Sizes are the simulators' own: iPad Pro 13-inch landscape
 * and iPhone portrait, both full-corner rectangles with no bezel.
 */

export type CaptureId =
  | "roster"
  | "roster-fdp"
  | "roster-phone"
  | "folder"
  | "folder-viewer"
  | "sector-overview"
  | "sector-folder"
  | "sector-dispatch"
  | "sector-departure"
  | "sector-arrival"
  | "sector-summary"
  | "oooi-off-block"
  | "oooi-take-off"
  | "oooi-landing"
  | "oooi-on-blocks"
  | "oooi-submit"
  | "journey-signature"
  | "journey-locked"
  | "signal-queued"
  | "signal-sent"
  | "handover-sign-out"
  | "handover-next"
  | "proof-light"
  | "proof-dark";

export type CaptureDevice = "ipad" | "iphone";

export interface Capture {
  readonly id: CaptureId;
  readonly device: CaptureDevice;
  /** Under `public/`, or `null` while the slot is still a neutral frame. */
  readonly src: string | null;
  /** The capture's own pixel size. */
  readonly width: number;
  readonly height: number;
}

/** iPad Pro 13-inch (M5) landscape, points × 2. */
const IPAD = { device: "ipad", src: null, width: 2752, height: 2064 } as const;
/** iPhone 18 Pro portrait, points × 3. Corrected on capture day if it differs. */
const IPHONE = {
  device: "iphone",
  src: null,
  width: 1206,
  height: 2622,
} as const;

export const CAPTURES: Readonly<Record<CaptureId, Capture>> = {
  roster: { id: "roster", ...IPAD },
  "roster-fdp": { id: "roster-fdp", ...IPAD },
  "roster-phone": { id: "roster-phone", ...IPHONE },
  folder: { id: "folder", ...IPAD },
  "folder-viewer": { id: "folder-viewer", ...IPAD },
  "sector-overview": { id: "sector-overview", ...IPAD },
  "sector-folder": { id: "sector-folder", ...IPAD },
  "sector-dispatch": { id: "sector-dispatch", ...IPAD },
  "sector-departure": { id: "sector-departure", ...IPAD },
  "sector-arrival": { id: "sector-arrival", ...IPAD },
  "sector-summary": { id: "sector-summary", ...IPAD },
  "oooi-off-block": { id: "oooi-off-block", ...IPAD },
  "oooi-take-off": { id: "oooi-take-off", ...IPAD },
  "oooi-landing": { id: "oooi-landing", ...IPAD },
  "oooi-on-blocks": { id: "oooi-on-blocks", ...IPAD },
  "oooi-submit": { id: "oooi-submit", ...IPAD },
  "journey-signature": { id: "journey-signature", ...IPAD },
  "journey-locked": { id: "journey-locked", ...IPAD },
  "signal-queued": { id: "signal-queued", ...IPAD },
  "signal-sent": { id: "signal-sent", ...IPAD },
  "handover-sign-out": { id: "handover-sign-out", ...IPAD },
  "handover-next": { id: "handover-next", ...IPAD },
  "proof-light": { id: "proof-light", ...IPAD },
  "proof-dark": { id: "proof-dark", ...IPAD },
};

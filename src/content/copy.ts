/**
 * Every word on the page.
 *
 * DRAFT, pending the owner's copy sign-off (BRIEF B8). Written only from what
 * the code supports (BRIEF §2.2): the feature wording is the research
 * shortlist's, the regulatory references are the corrected ones, and nothing
 * here claims a customer, a certification, a guarantee or an approval.
 *
 * Phrases that are deliberately NOT here, and must not be added: "exactly
 * once", "never loses data", "biometric", "100% offline", "certified EFB",
 * "FAA approved", "EASA certified", "legally binding e-signature", "SSO",
 * "MDM-ready", "encrypted at rest", "Android", "trusted by".
 */

import { THEME } from "@/theme";

const product = THEME.productName;

export const COPY = {
  meta: {
    title: `${product} for iPad — the crew's day, from roster to sign-out`,
    description: `${product} is an iPad-first Electronic Flight Bag for airline crew: the roster, the flight folder, the sector workflow, times and fuel and the journey log on one device that works with no signal.`,
  },

  chrome: {
    demo: "Request a demo",
    demoShort: "Demo",
    skipToContent: "Skip to content",
    duty: "Duty",
    limit: "Limit",
  },

  hero: {
    eyebrow: `${product} for iPad`,
    headline: "The crew's day, from roster to sign-out.",
    lead: `An Electronic Flight Bag built for the aircraft rather than the office: the roster, the flight folder, the sector workflow, times and fuel, and the journey log, on one iPad that works with no signal.`,
    cta: "Request a demo",
    scroll: "Follow one duty day",
  },

  roster: {
    eyebrow: "Flight roster",
    headline: "The day, as ops planned it.",
    lead: "Every leg, ground time and crew member for the duty, in UTC. Duty time is shown against the live limit, and an FDP extension can be requested from the roster itself.",
    report: "Report",
    fdp: "FDP",
    limit: "Limit",
  },

  folder: {
    eyebrow: "Flight folder",
    headline: "Documents on the iPad before the signal goes.",
    lead: "Each leg's documents are cached on the device and open offline.",
    documents: [
      "Operational flight plan",
      "Weather briefing",
      "NOTAM briefing",
      "Load sheet",
    ],
    cached: "On device",
    offline: "No signal — opens offline",
  },

  sector: {
    eyebrow: "Sector detail",
    headline: "One sector. Six steps. In order.",
    lead: "Overview, Flight Folder, Dispatch, Departure, Arrival and Summary, unlocked in order so a step cannot be skipped.",
    steps: [
      "Overview",
      "Flight Folder",
      "Dispatch",
      "Departure",
      "Arrival",
      "Summary",
    ],
    locked: "Locked",
    current: "Open",
    done: "Done",
  },

  oooi: {
    eyebrow: "Times and fuel",
    headline: "Times and fuel, captured where they happen.",
    lead: "Off-block, take-off, landing and on-blocks are each recorded with a 1.5-second hold, together with the fuel reading, and the flight is closed with one post-flight submission.",
    events: {
      offBlock: "Off-block",
      takeOff: "Take-off",
      landing: "Landing",
      onBlocks: "On-blocks",
    },
    hold: "Hold to confirm",
    fuelUnit: "kg",
    submitted: "Post-flight submission sent",
  },

  journey: {
    eyebrow: "Digital journey log",
    headline: "Signed at the aircraft.",
    lead: "The journey log is signed with a photo signature and an on-device face check, then locked under its number.",
    signature: "Photo signature",
    faceCheck: "Face check on device",
    log: "Journey log",
    locked: "Locked",
    open: "Open",
  },

  signal: {
    eyebrow: "No signal",
    headline: "Works with no signal.",
    lead: "Times, fuel, sector steps, sign-off and FDP requests are recorded on the device and replayed in the order performed once coverage returns. A Sync Status card shows what is still queued. Defect reports and ECTM readings send directly.",
    syncStatus: "Sync status",
    queue: [
      "Take-off time",
      "Fuel reading",
      "Sector step: Arrival",
      "Sign-off",
      "FDP request",
    ],
    queued: "Queued",
    sent: "Sent",
  },

  handover: {
    eyebrow: "Shared iPad",
    headline: "One iPad, every crew member.",
    lead: "Sign-out wipes one crew member's records, documents and notifications before the next pilot uses the device.",
    items: ["Records", "Documents", "Notifications"],
    signingOut: "Signing out",
    cleared: "Cleared",
    ready: "Ready for the next crew member",
  },

  proof: {
    eyebrow: "Built on",
    headline: "What it is built on.",
    items: [
      {
        title: "UTC throughout",
        body: "Every time is Zulu, with clock-drift correction against the server.",
      },
      {
        title: "Hold to confirm",
        body: "Every irreversible action is a deliberate hold, never a tap.",
      },
      {
        title: "iPad landscape first",
        body: "Designed for the iPad in landscape, with iPhone layouts.",
      },
      {
        title: "Light and dark",
        body: "Both modes, from one set of design tokens.",
      },
      {
        title: "Cold start offline",
        body: "Opens from the persisted read cache with no network.",
      },
    ],
  },

  regulatory: {
    eyebrow: "EFB programme",
    headline: "Designed to support your EFB program authorisation.",
    body: [
      "Under FAA AC 120-76E, and in the EU under SPA.EFB.100 of Regulation (EU) 965/2012 as amended by Implementing Regulation (EU) 2018/1975, it is the operator that is authorised to use an EFB application — not the vendor.",
      `${product} is built to fit that process.`,
    ],
  },

  demo: {
    eyebrow: "Request a demo",
    headline: "See the day on your own fleet.",
    lead: `${product} is pre-launch. Tell us about your operation and we will arrange a demonstration.`,
    fields: {
      name: "Name",
      email: "Work email",
      airline: "Airline",
      role: "Role",
      fleetSize: "Fleet size",
      message: "Message",
      messagePlaceholder: "Fleet types, bases, what you would like to see.",
    },
    submit: "Request a demo",
    sending: "Sending…",
    sent: "Thank you. We will be in touch.",
    failed:
      "Something went wrong and the request was not sent. Please try again in a moment.",
    invalid: "Please check the highlighted fields.",
    privacy: "What you enter here is used only to reply to you.",
  },

  footer: {
    legal: `© 2026 ${THEME.legalName}`,
    apple:
      "iPad and iPhone are trademarks of Apple Inc., registered in the U.S. and other countries.",
    credits:
      "Earth imagery: NASA Earth Observatory (Blue Marble, Black Marble). Coastlines: Natural Earth. Airport data: mwgg/Airports, MIT licence.",
    privacy: "Privacy",
  },
} as const;

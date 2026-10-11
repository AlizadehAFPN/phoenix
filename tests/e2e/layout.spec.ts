import { expect, test, type Page } from "@playwright/test";

/**
 * Every beat, at every size, in every engine: the words fit between the
 * header and the bottom of the screen, nothing spills sideways, the header's
 * parts do not collide, and the end of the page shows the whole form.
 *
 * Failures are collected and reported together, so one run shows everything
 * that is wrong at a size rather than the first thing. A screenshot of each
 * beat is written next to the test's output for review.
 */

const TRACK = [
  "hero",
  "roster",
  "folder",
  "sector",
  "oooi",
  "journey",
  "signal",
  "handover",
  "proof",
  "regulatory",
] as const;

async function scrollToBeat(page: Page, id: string, k: number): Promise<void> {
  await page.evaluate(
    ([beatId, fraction, isLast]) => {
      const el = document.querySelector<HTMLElement>(`[data-beat="${beatId}"]`);
      if (el === null) throw new Error(`no beat "${beatId}"`);
      const top = el.getBoundingClientRect().top + window.scrollY;
      /* A track's beat spans its height, except the last one's, which ends
         a screen earlier, as the demo section comes into view. */
      const span = el.offsetHeight - (isLast ? window.innerHeight : 0);
      window.scrollTo(0, Math.round(top + span * fraction));
    },
    [id, k, id === TRACK[TRACK.length - 1]] as const,
  );
  /* The stage writes on the scroll event; rows ease in over 700 ms. */
  await page.waitForTimeout(900);
}

/** The active stage block against the screen at the current position. */
async function stageProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const header = document.querySelector("header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const active = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-block][data-active='true']",
      ),
    ];
    if (active.length !== 1) {
      problems.push(`${String(active.length)} active blocks`);
      return problems;
    }
    const inner = active[0]?.firstElementChild;
    if (!(inner instanceof HTMLElement)) return ["no block content"];
    const r = inner.getBoundingClientRect();
    if (r.top < headerBottom - 1) {
      problems.push(
        `top ${r.top.toFixed(0)} is under the header (${headerBottom.toFixed(0)})`,
      );
    }
    /* At least 16px above the bottom edge: a button touching the edge is
       the bug the owner saw on his phone. */
    if (r.bottom > vh - 16) {
      problems.push(
        `bottom ${r.bottom.toFixed(0)} is within 16px of the screen's edge (${String(vh)})`,
      );
    }
    for (const el of inner.querySelectorAll<HTMLElement>(
      "p, h1, h2, h3, li, a, span",
    )) {
      const b = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (b.width === 0 || b.height === 0) continue;
      if (style.display === "none" || style.visibility === "hidden") continue;
      const text = (el.textContent ?? "").trim().slice(0, 32);
      if (b.right > vw - 2 || b.left < 2) {
        problems.push(
          `"${text}" spills sideways (${b.left.toFixed(0)}–${b.right.toFixed(0)} of ${String(vw)})`,
        );
      }
      if (
        style.textOverflow === "ellipsis" &&
        el.scrollWidth > el.clientWidth + 1
      ) {
        problems.push(`"${text}" is cut short`);
      }
    }
    return problems;
  });
}

/** The header's three parts: inside the screen and clear of each other. */
async function headerProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    const header = document.querySelector("header");
    if (header === null) return ["no header"];
    const links = [...header.querySelectorAll<HTMLElement>("a")];
    const instrument = header.querySelector<HTMLElement>(
      "[aria-hidden='true']",
    );
    const parts = [links[0], instrument, links[links.length - 1]]
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .map((el) => ({ el, b: el.getBoundingClientRect() }))
      .filter(({ b }) => b.width > 0);
    for (const { el, b } of parts) {
      if (b.left < 0 || b.right > vw) {
        problems.push(`${el.className} leaves the screen`);
      }
    }
    for (let i = 0; i < parts.length; i += 1) {
      for (let j = i + 1; j < parts.length; j += 1) {
        const a = parts[i]?.b;
        const c = parts[j]?.b;
        if (a === undefined || c === undefined) continue;
        const overlap =
          a.left < c.right - 1 &&
          c.left < a.right - 1 &&
          a.top < c.bottom - 1 &&
          c.top < a.bottom - 1;
        if (overlap)
          problems.push(`parts ${String(i)} and ${String(j)} overlap`);
      }
    }
    return problems;
  });
}

/** The end of the page: the form whole and clear of the header. */
async function endProblems(page: Page): Promise<string[]> {
  const problems: string[] = [];

  /* With the section's top at the top of the screen, its headline is clear
     of the header. */
  await page.evaluate(() => {
    const section = document.querySelector("#demo");
    if (section === null) throw new Error("no demo section");
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
  });
  await page.waitForTimeout(600);
  problems.push(
    ...(await page.evaluate(() => {
      const out: string[] = [];
      const headerBottom =
        document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const headline = document.querySelector("#demo h2");
      const top = headline?.getBoundingClientRect().top ?? 0;
      if (top < headerBottom) {
        out.push(
          `the demo headline starts under the header (${top.toFixed(0)})`,
        );
      }
      return out;
    })),
  );

  /* At the very bottom: when the section and the footer fit one screen, all
     of the form is in view; at any size, nothing spills sideways. */
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.waitForTimeout(900);
  problems.push(
    ...(await page.evaluate(() => {
      const out: string[] = [];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const header = document.querySelector("header")?.getBoundingClientRect();
      const section = document.querySelector("#demo");
      const footer = document.querySelector("footer");
      if (header === undefined || section === null || footer === null) {
        return ["missing header, demo section or footer"];
      }
      const room = vh - header.height;
      const fits =
        section.getBoundingClientRect().height +
          footer.getBoundingClientRect().height <=
        room;
      /* On a laptop or larger the end of the page must show the whole form
         and the footer at once — the owner's report from his MacBook. */
      if (vw >= 1024 && vh >= 600 && !fits) {
        out.push(
          `the form and footer need ${(section.getBoundingClientRect().height + footer.getBoundingClientRect().height).toFixed(0)}px but only ${room.toFixed(0)}px are free`,
        );
      }
      const controls = [
        ...section.querySelectorAll<HTMLElement>(
          "h2, input:not([type='hidden']):not([tabindex='-1']), textarea, button",
        ),
      ];
      for (const el of controls) {
        const b = el.getBoundingClientRect();
        const name = el.getAttribute("name") ?? el.tagName.toLowerCase();
        if (fits && (b.top < header.bottom - 1 || b.bottom > vh + 1)) {
          out.push(`at the end, ${name} is out of view`);
        }
        if (b.left < 2 || b.right > vw - 2) out.push(`${name} spills sideways`);
      }
      if (footer.getBoundingClientRect().bottom > vh + 1) {
        out.push("the footer is below the screen at the end");
      }
      return out;
    })),
  );
  return problems;
}

/**
 * The share of near-black pixels in the region of the screen where the
 * globe's point of interest sits, decoded in the page itself so the check
 * runs the same in every engine and in a Linux container. Over a daylit
 * globe nothing is that dark; a black ocean or a black square is.
 */
async function blackShare(page: Page): Promise<number> {
  const png = await page.screenshot();
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    if (g === null) return 1;
    g.drawImage(img, 0, 0);
    const portrait = img.height > img.width;
    const [fx0, fx1, fy0, fy1] = portrait
      ? [0.1, 0.9, 0.12, 0.5]
      : [0.45, 0.95, 0.15, 0.85];
    const x0 = Math.floor(img.width * fx0);
    const y0 = Math.floor(img.height * fy0);
    const w = Math.floor(img.width * fx1) - x0;
    const h = Math.floor(img.height * fy1) - y0;
    const d = g.getImageData(x0, y0, w, h).data;
    let black = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 5) {
      n += 1;
      if ((d[i] ?? 0) < 5 && (d[i + 1] ?? 0) < 5 && (d[i + 2] ?? 0) < 5) {
        black += 1;
      }
    }
    return n === 0 ? 1 : black / n;
  }, png.toString("base64"));
}

test("every beat and the end of the page fit the screen", async ({
  page,
}, info) => {
  await page.goto("/");
  /* The hero's words arrive a second after the frame lifts. */
  await page.waitForTimeout(2500);

  const report: string[] = [];
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflowX > 1) {
    report.push(`the page is ${String(overflowX)}px wider than the screen`);
  }
  for (const p of await headerProblems(page)) report.push(`header: ${p}`);

  for (const id of TRACK) {
    await scrollToBeat(page, id, 0.5);
    for (const p of await stageProblems(page)) report.push(`${id}: ${p}`);
    if (id === "journey") {
      /* 06:15Z over Cairo: the whole view is in daylight. Give the detail
         textures time to arrive first. */
      await page.waitForTimeout(2500);
      const share = await blackShare(page);
      if (share > 0.005) {
        report.push(
          `journey: ${(share * 100).toFixed(1)}% of the daylit globe is black`,
        );
      }
    }
    await page.screenshot({ path: info.outputPath(`${id}.png`) });
  }

  for (const p of await endProblems(page)) report.push(`end: ${p}`);
  await page.screenshot({ path: info.outputPath("end.png") });

  expect(report, report.join("\n")).toEqual([]);
});

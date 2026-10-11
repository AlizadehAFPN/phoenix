"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import type { ReactNode } from "react";

import { EASING, gsapEasing, type EasingName } from "@/lib/motion/easing";
import { resolveScroll } from "@/lib/scroll/beat-registry";
import { writeScroll } from "@/lib/scroll/scroll-state";

gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);

/* The app's curves, registered once under their own names so a tween can say
   `ease: "climb"`. */
for (const name of Object.keys(EASING) as EasingName[]) {
  CustomEase.create(name, gsapEasing(name));
}

/**
 * The scroll system.
 *
 * NATIVE ON TOUCH, SMOOTHED ON A MOUSE (STORYBOARD §5). Lenis is created
 * only for a fine pointer with motion allowed; on an iPad or iPhone the
 * page scrolls exactly as Safari scrolls it, and ScrollTrigger reads the
 * native position. Lenis is driven from GSAP's ticker so the two never
 * disagree about which frame it is, and lag smoothing is off so a dropped
 * frame moves the scroll rather than freezing it.
 */
export function ScrollProvider({ children }: { readonly children: ReactNode }) {
  useGSAP(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.defaults({ invalidateOnRefresh: true });

    /* The one writer of the scroll state. Beats register their ranges; this
       resolves the active beat on every update and after every refresh. */
    const resolve = (scroll: number) => {
      const { beat, progress } = resolveScroll(scroll);
      writeScroll(beat, progress);
    };
    const global = ScrollTrigger.create({
      start: 0,
      end: () => ScrollTrigger.maxScroll(window),
      onUpdate: (self) => resolve(self.scroll()),
      onRefresh: (self) => resolve(self.scroll()),
    });
    resolve(window.scrollY);

    if (!fine || reduced) {
      return () => {
        global.kill();
      };
    }

    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.12,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      global.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
 * NATIVE SCROLL, EVERYWHERE. No smoothing library takes the wheel over: a
 * main-thread scroll hijack (Lenis was tried) makes Chrome's compositor
 * move the fixed layers by one wheel step before the main thread catches
 * up, which shows as a black band flashing at the top of the frame. The
 * page needs no hijack — nothing in the DOM is scrubbed by scroll except
 * the stage's cross-fades, and the camera already glides with critically
 * damped smoothing — so the browser scrolls exactly as the user expects on
 * every input, and ScrollTrigger reads the native position.
 *
 * This component owns the ONE writer of the scroll state: beats register
 * their ranges, and a global trigger resolves the active beat on every
 * update and after every refresh.
 */
export function ScrollProvider({ children }: { readonly children: ReactNode }) {
  useGSAP(() => {
    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.defaults({ invalidateOnRefresh: true });

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

    return () => {
      global.kill();
    };
  }, []);

  return <>{children}</>;
}

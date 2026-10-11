"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

import { registerBeatRange } from "@/lib/scroll/beat-registry";
import { beat, type BeatId } from "@/lib/timeline/beats";

import styles from "./Beat.module.css";

/**
 * One beat of the page (STORYBOARD §4): a section that reports its progress
 * to the scroll state and, on desktop, pins for the length the score gives it.
 *
 * PINS ON A FINE POINTER ONLY. On phones and tablets the section is simply
 * tall and scrolls through; the scene and the chrome read the same progress
 * either way, so the two layouts are one page at two paces, not two pages.
 *
 * Text inside the beat that carries `data-reveal` fades and rises once, the
 * first time the beat comes into view — including on load, for the hero —
 * through a second, one-shot trigger, so sections stay thin.
 */
export function Beat({
  id,
  children,
  className,
}: {
  readonly id: BeatId;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const { pinVh } = beat(id);

  useGSAP(
    () => {
      const el = section.current;
      const pinEl = pin.current;
      if (el === null || pinEl === null) return;

      /* The reveal: once, when the beat's top reaches the lower part of the
         viewport. Fires immediately for anything already in view. */
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => el.classList.add("is-in"),
      });

      const mm = gsap.matchMedia();

      /* The trigger only measures: the beat's scroll range goes to the
         registry, and the global trigger in ScrollProvider resolves which
         beat is active from the scroll position. */
      mm.add("(min-width: 1024px) and (pointer: fine)", () => {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          /* An unpinned beat is complete once it is fully in view, which the
             last beat can actually reach; "bottom top" never arrives for it. */
          end: pinVh > 0 ? `+=${String(pinVh)}%` : "bottom bottom",
          pin: pinVh > 0 ? pinEl : false,
          pinSpacing: true,
          anticipatePin: 1,
        });
        return registerBeatRange(id, {
          start: () => trigger.start,
          end: () => trigger.end,
        });
      });

      mm.add("not all and (min-width: 1024px) and (pointer: fine)", () => {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top 70%",
          end: "bottom 30%",
        });
        return registerBeatRange(id, {
          start: () => trigger.start,
          end: () => trigger.end,
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: section, dependencies: [id, pinVh] },
  );

  return (
    <section
      ref={section}
      id={id}
      data-beat={id}
      className={[
        styles.beat,
        pinVh > 0 ? styles.pinned : "",
        className ?? "",
      ].join(" ")}
    >
      <div ref={pin} className={styles.pin}>
        {children}
      </div>
    </section>
  );
}

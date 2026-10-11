"use client";

import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { registerBeatRange } from "@/lib/scroll/beat-registry";
import { beat, type BeatId } from "@/lib/timeline/beats";

import styles from "./BeatTrack.module.css";

/**
 * One beat's share of the scroll track (STORYBOARD §4): an empty section
 * `lengthVh` tall whose only job is to be scrolled through. Its scroll
 * range goes to the registry; the global trigger in `ScrollProvider`
 * resolves the active beat and its progress from the scroll position, and
 * the stage draws everything from that. Nothing pins.
 */
export function BeatTrack({ id }: { readonly id: BeatId }) {
  const section = useRef<HTMLElement>(null);
  const { lengthVh } = beat(id);

  useGSAP(
    () => {
      const el = section.current;
      if (el === null) return;
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom top",
      });
      const unregister = registerBeatRange(id, {
        start: () => trigger.start,
        end: () => trigger.end,
      });
      return () => {
        unregister();
        trigger.kill();
      };
    },
    { scope: section, dependencies: [id] },
  );

  return (
    <section
      ref={section}
      id={id}
      data-beat={id}
      className={styles.track}
      style={{ height: `${String(lengthVh)}vh` }}
      aria-hidden="true"
    />
  );
}

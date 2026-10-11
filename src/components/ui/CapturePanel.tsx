import Image from "next/image";

import { CAPTURES, type CaptureId } from "@/components/captures/manifest";

import styles from "./CapturePanel.module.css";

/**
 * A frameless app screen (BRIEF §2.1, STORYBOARD §5): the capture itself, a
 * full-corner rectangle with the login card's edge stroke and the glass
 * panel's shadow ramp, turned a few degrees toward the reader. No bezel, no
 * device-shaped mask, never a spin.
 *
 * While a slot has no capture it renders as neutral glass carrying its
 * label, at the capture's exact aspect ratio, so the layout is final before
 * the screenshots exist.
 */
export function CapturePanel({
  id,
  label,
  alt,
  priority = false,
  className,
}: {
  readonly id: CaptureId;
  /** Shown on the neutral frame only. */
  readonly label: string;
  readonly alt: string;
  readonly priority?: boolean | undefined;
  readonly className?: string | undefined;
}) {
  const capture = CAPTURES[id];
  return (
    <figure
      className={[styles.panel, className ?? ""].join(" ")}
      data-capture={id}
      data-device={capture.device}
      style={{
        aspectRatio: `${String(capture.width)} / ${String(capture.height)}`,
      }}
    >
      {capture.src === null ? (
        <div className={styles.empty} role="img" aria-label={alt}>
          <span className={styles.label}>{label}</span>
        </div>
      ) : (
        <Image
          src={capture.src}
          alt={alt}
          width={capture.width}
          height={capture.height}
          priority={priority}
          sizes="(min-width: 1024px) 44vw, 92vw"
          className={styles.image}
        />
      )}
    </figure>
  );
}

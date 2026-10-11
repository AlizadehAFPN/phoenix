"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  type Camera,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  type ShaderMaterial,
  Sprite,
  Vector3,
} from "three";
import type { Line2 } from "three/addons/lines/Line2.js";

import { airport, dayAirports, legMinutes, type Day } from "@/lib/day/day";
import { altitudeAt, flightAt } from "@/lib/day/flight";
import { slerp, toVector, type Vec3 } from "@/lib/day/geo";
import { readScroll } from "@/lib/scroll/scroll-state";
import { BEAT_IDS, type OooiEvent } from "@/lib/timeline/beats";
import { SECTOR_STEPS } from "@/lib/timeline/score";
import { hexToRgb, palette } from "@/theme";

import { placeLabel } from "./labels";
import { OOOI_EVENTS } from "./SceneLabels";
import { RING_FRAGMENT, RING_VERTEX } from "./shaders/globe";

/**
 * The day's legs on the globe (STORYBOARD §1): the lines, the head of the
 * line, the airports with their rings of signal, the sector's six stations,
 * the hold-to-confirm ring, the queued marks of the no-signal leg, and the
 * screen positions of the DOM labels. Everything here is positioned by the
 * clock through `flightAt`, so it can never disagree with the roster.
 *
 * `#0088ff` is reserved for the flight and the live elements; the airports
 * and the stations are the neutral ramp.
 */

const SAMPLES = 160;
const LINE_WIDTH = 1.6;
const QUEUED_WIDTH = 1.0;
/* Marker sizes as angles seen from the camera, in radians, so they keep one
   size on screen whether the camera is in orbit or skimming the surface. */
const HEAD_ANGLE = 0.03;
const RING_ANGLE = 0.02;
const SIGNAL_ANGLE = 0.018;
const DOT_ANGLE = 0.0035;
/* The geometry's own radius, which the per-frame scale is measured against. */
const RING_RADIUS = 0.012;
const SIGNAL_RING = 0.016;
const DOT_RADIUS = 0.003;

/** The glow at the head, from the app's own disc glow profile (profiles.ts). */
const DISC_GLOW_STOPS: readonly (readonly [number, number])[] = [
  [0.0, 0.9969],
  [0.1407, 0.9865],
  [0.2714, 0.9261],
  [0.3618, 0.815],
  [0.4271, 0.6891],
  [0.4824, 0.5597],
  [0.5327, 0.4352],
  [0.5879, 0.3055],
  [0.6533, 0.1792],
  [0.7387, 0.0727],
  [0.8643, 0.0123],
  [1.0, 0.0009],
];

function glowTexture(hex: string): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("no 2d context");
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, opacity] of DISC_GLOW_STOPS) {
    gradient.addColorStop(
      offset,
      `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(opacity)})`,
    );
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** The points of one leg, at the flight's altitude profile. */
function legPoints(day: Day, index: number): Vector3[] {
  const leg = day.legs[index];
  if (leg === undefined) return [];
  const from = airport(leg.from);
  const to = airport(leg.to);
  const points: Vector3[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const f = i / SAMPLES;
    const [x, y, z] = slerp(from, to, f);
    const r = 1 + altitudeAt(f);
    points.push(new Vector3(x * r, y * r, z * r));
  }
  return points;
}

function cumulativeLength(points: readonly Vector3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) length += a.distanceTo(b);
  }
  return length;
}

/** The share of a leg flown at `clock`, 0..1, with the ground phases at the ends. */
function flownShare(day: Day, index: number, clock: number): number {
  const leg = day.legs[index];
  if (leg === undefined) return 0;
  const t = legMinutes(leg);
  if (clock <= t.takeOff) return 0;
  if (clock >= t.landing) return 1;
  return (clock - t.takeOff) / (t.landing - t.takeOff);
}

/** Orients a flat object to lie on the surface at a point, facing outward. */
function orientOnSurface(object: Mesh | Group, position: Vec3, lift = 0): void {
  const p = new Vector3(position[0], position[1], position[2]);
  const n = p.clone().normalize();
  object.position.copy(n.clone().multiplyScalar(p.length() + lift));
  object.lookAt(n.clone().multiplyScalar(p.length() + lift + 1));
}

/** Projects a world point to the canvas and says whether it faces the camera. */
const projected = new Vector3();
function project(
  position: Vec3,
  camera: Camera,
  width: number,
  height: number,
): { readonly x: number; readonly y: number; readonly facing: boolean } {
  projected.set(position[0], position[1], position[2]);
  const toCamera = camera.position.clone().sub(projected).normalize();
  const facing = projected.clone().normalize().dot(toCamera) > 0.05;
  projected.project(camera);
  return {
    x: ((projected.x + 1) / 2) * width,
    y: ((1 - projected.y) / 2) * height,
    facing: facing && projected.z < 1,
  };
}

/** Where each OOOI event of leg 1 happens on the line: the gates and the runway ends. */
const EVENT_SHARE: Readonly<Record<OooiEvent, number>> = {
  offBlock: 0,
  takeOff: 0.015,
  landing: 0.985,
  onBlocks: 1,
};

/** Queued marks along the no-signal leg: the actions performed en route. */
const QUEUED_MARKS: readonly number[] = [0.03, 0.22, 0.48, 0.74, 0.97];

export function Route({ day }: { readonly day: Day }) {
  const [lr, lg, lb] = hexToRgb(palette.primary[400]);
  const lineColor = useMemo(() => new Color(lr, lg, lb), [lr, lg, lb]);
  /* Above 1.0 on purpose: the tail and the head are what bloom. */
  const tailColor = useMemo(
    () => new Color(lr, lg, lb).multiplyScalar(3.2),
    [lr, lg, lb],
  );
  const [nr, ng, nb] = hexToRgb(palette.primary[200]);
  const neutral = useMemo(() => new Color(nr, ng, nb), [nr, ng, nb]);
  const [wr, wg, wb] = hexToRgb(palette.grey.white);
  const coreColor = useMemo(
    () => new Color(wr, wg, wb).multiplyScalar(2.4),
    [wr, wg, wb],
  );

  const legs = useMemo(
    () =>
      day.legs.map((_, index) => {
        const points = legPoints(day, index);
        return { points, length: cumulativeLength(points) };
      }),
    [day],
  );

  const glow = useMemo(() => glowTexture(palette.primary[400]), []);
  const core = useMemo(() => glowTexture(palette.grey.white), []);

  const solidRefs = useRef<(Line2 | null)[]>([]);
  const queuedRefs = useRef<(Line2 | null)[]>([]);
  const tailRefs = useRef<(Line2 | null)[]>([]);
  const head = useRef<Group>(null);
  const headGlow = useRef<Sprite>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<ShaderMaterial>(null);
  const stations = useRef<(Mesh | null)[]>([]);
  const marks = useRef<(Mesh | null)[]>([]);

  const ringUniforms = useMemo(
    () => ({
      uFill: { value: 0 },
      uOuter: { value: 0.012 },
      uInner: { value: 0.0105 },
      uColor: { value: lineColor },
      uOpacity: { value: 0 },
    }),
    [lineColor],
  );

  const airports = useMemo(() => dayAirports(day), [day]);
  const leg1 = day.legs[0];
  const leg1Times = leg1 === undefined ? null : legMinutes(leg1);

  const stationPositions = useMemo(() => {
    const points = legs[0]?.points ?? [];
    return Array.from({ length: SECTOR_STEPS }, (_, i) => {
      const f = i / (SECTOR_STEPS - 1);
      const p = points[Math.round(f * (points.length - 1))];
      return p === undefined ? ([0, 0, 0] as Vec3) : ([p.x, p.y, p.z] as Vec3);
    });
  }, [legs]);
  const markPositions = useMemo(() => {
    const points = legs[1]?.points ?? [];
    return QUEUED_MARKS.map((f) => {
      const p = points[Math.round(f * (points.length - 1))];
      return p === undefined ? ([0, 0, 0] as Vec3) : ([p.x, p.y, p.z] as Vec3);
    });
  }, [legs]);
  const eventPositions = useMemo(() => {
    const points = legs[0]?.points ?? [];
    return OOOI_EVENTS.map((event) => {
      const p = points[Math.round(EVENT_SHARE[event] * (points.length - 1))];
      return p === undefined ? ([0, 0, 0] as Vec3) : ([p.x, p.y, p.z] as Vec3);
    });
  }, [legs]);

  useFrame((state) => {
    const { beat, progress, score } = readScroll();
    const clock = score.clock;
    const beatIndex = BEAT_IDS.indexOf(beat);
    const flight = flightAt(day, clock);
    const { width, height } = state.size;

    /* Which legs show at all: in the roster beat they draw in one after
       another; from then on the flown share of each. */
    legs.forEach((leg, i) => {
      const solid = solidRefs.current[i];
      const queued = queuedRefs.current[i];
      if (solid === null || solid === undefined) return;

      let shown: number;
      if (beat === "hero") shown = 0;
      else if (beat === "roster") {
        shown = Math.min(1, Math.max(0, (progress - 0.15 - i * 0.22) / 0.3));
      } else shown = flownShare(day, i, clock);

      /* Beat 06: the no-signal leg is queued while airborne and fills in,
         oldest first, during the replay. */
      let solidShare = shown;
      let queuedShare = 0;
      /* Beat 03: the sector's leg is planned, not yet flown — the thin line
         carries the stations until the flight draws the solid one. */
      if (i === 0 && beat === "sector") queuedShare = 1;
      if (i === 1 && beat === "signal") {
        const airborne = flownShare(day, 1, clock);
        solidShare = score.replay > 0 ? airborne * score.replay : 0;
        queuedShare = airborne;
      }

      const total = leg.length;
      solid.material.dashSize = total * solidShare;
      solid.material.gapSize = total * 4 + 1;
      solid.visible = solidShare > 0.0005;

      /* The comet: a short bright run ending at the drawing front, so the
         line's growth — and the aircraft in flight — carries light. */
      const tail = tailRefs.current[i];
      if (tail !== null && tail !== undefined) {
        const tailLength = Math.min(total * 0.12, total * solidShare);
        tail.material.dashSize = tailLength;
        tail.material.gapSize = total * 4 + 1;
        tail.material.dashOffset = -(total * solidShare - tailLength);
        tail.visible = solidShare > 0.002 && solidShare < 0.9995;
      }
      if (queued !== null && queued !== undefined) {
        queued.material.dashSize = total * queuedShare;
        queued.material.gapSize = total * 4 + 1;
        queued.visible = queuedShare > 0.0005;
      }
    });

    /* The head of the line: where the aircraft is now. Hidden until the
       sector beat, when the day's flying begins. */
    if (head.current !== null) {
      const r = 1 + flight.altitude + 0.003;
      head.current.position.set(
        flight.position[0] * r,
        flight.position[1] * r,
        flight.position[2] * r,
      );
      head.current.visible = beatIndex >= BEAT_IDS.indexOf("sector");
    }
    if (head.current !== null && headGlow.current !== null) {
      /* A constant size on screen: the glow is an angle, not a length. */
      const d = state.camera.position.distanceTo(head.current.position);
      const s = d * HEAD_ANGLE;
      headGlow.current.scale.set(s, s, 1);
      head.current.children[1]?.scale.set(s * 0.3, s * 0.3, 1);
    }

    /* The hold-to-confirm ring, around the head while a ring segment fills. */
    if (ring.current !== null) {
      const ru = ringMaterial.current?.uniforms;
      if (ru?.uFill !== undefined) ru.uFill.value = score.ring?.fill ?? 0;
      if (ru?.uOpacity !== undefined)
        ru.uOpacity.value = score.ring === null ? 0 : 1;
      ring.current.visible = score.ring !== null;
      orientOnSurface(ring.current, flight.position, flight.altitude + 0.002);
      const d = state.camera.position.distanceTo(ring.current.position);
      ring.current.scale.setScalar((d * RING_ANGLE) / RING_RADIUS);
    }

    /* The sector's stations: lit in order through the stepper, then all lit. */
    stations.current.forEach((station, i) => {
      if (station === null) return;
      const past = beatIndex > BEAT_IDS.indexOf("sector");
      const lit = past || (beat === "sector" && i <= score.step);
      station.visible = beat === "sector";
      station.scale.setScalar(lit ? 1 : 0.6);
      (station.material as { opacity: number }).opacity = lit ? 1 : 0.35;
    });

    /* The queued marks: faint while queued, filled in order as the replay runs. */
    marks.current.forEach((mark, i) => {
      if (mark === null) return;
      const airborne = flownShare(day, 1, clock);
      const reached = QUEUED_MARKS[i] ?? 1;
      const shown = beat === "signal" && airborne >= reached;
      const filled = score.replay >= (i + 1) / QUEUED_MARKS.length;
      const later = beatIndex > BEAT_IDS.indexOf("signal");
      mark.visible = shown || later;
      mark.scale.setScalar(filled || later ? 1 : 0.7);
      (mark.material as { opacity: number }).opacity =
        filled || later ? 1 : 0.5;
    });

    /* The DOM labels: airport codes whenever the airport faces the camera,
       OOOI labels once their ring has filled, through the journey beat's
       first half. */
    for (const a of airports) {
      const p = project(toVector(a), state.camera, width, height);
      placeLabel(
        `airport:${a.code}`,
        p.x,
        p.y,
        p.facing && beat !== "hero" && beat !== "demo",
      );
    }
    OOOI_EVENTS.forEach((event, i) => {
      const position = eventPositions[i];
      if (position === undefined || leg1Times === null) return;
      const p = project(position, state.camera, width, height);
      const ringDone = score.ring?.event === event && score.ring.fill >= 0.999;
      const passed = clock > leg1Times[event] || ringDone;
      const inBeat = beat === "oooi" || (beat === "journey" && progress < 0.5);
      placeLabel(`oooi:${event}`, p.x, p.y, p.facing && inBeat && passed);
    });
  });

  return (
    <group>
      {legs.map((leg, i) => (
        <group key={i}>
          <Line
            ref={(el) => {
              solidRefs.current[i] = el as Line2 | null;
            }}
            points={leg.points}
            color={lineColor}
            lineWidth={LINE_WIDTH}
            dashed
            dashSize={0}
            gapSize={leg.length * 4 + 1}
            transparent
            opacity={0.95}
            depthWrite={false}
            renderOrder={2}
          />
          <Line
            ref={(el) => {
              tailRefs.current[i] = el as Line2 | null;
            }}
            points={leg.points}
            color={tailColor}
            lineWidth={LINE_WIDTH * 1.4}
            dashed
            dashSize={0}
            gapSize={leg.length * 4 + 1}
            transparent
            opacity={1}
            depthWrite={false}
            renderOrder={3}
          />
          <Line
            ref={(el) => {
              queuedRefs.current[i] = el as Line2 | null;
            }}
            points={leg.points}
            color={lineColor}
            lineWidth={QUEUED_WIDTH}
            dashed
            dashSize={0}
            gapSize={leg.length * 4 + 1}
            transparent
            opacity={0.4}
            depthWrite={false}
            renderOrder={2}
          />
        </group>
      ))}

      {airports.map((a) => (
        <AirportMarker
          key={a.code}
          position={toVector(a)}
          color={neutral}
          ringColor={lineColor}
        />
      ))}

      {stationPositions.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            stations.current[i] = el;
          }}
          position={[p[0] * 1.004, p[1] * 1.004, p[2] * 1.004]}
          renderOrder={2}
        >
          <sphereGeometry args={[0.0025, 12, 12]} />
          <meshBasicMaterial
            color={neutral}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      ))}

      {markPositions.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            marks.current[i] = el;
          }}
          position={[p[0], p[1], p[2]]}
          renderOrder={2}
        >
          <sphereGeometry args={[0.003, 12, 12]} />
          <meshBasicMaterial
            color={lineColor}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      ))}

      <group ref={head} visible={false}>
        <sprite ref={headGlow} scale={[0.014, 0.014, 1]} renderOrder={4}>
          <spriteMaterial
            map={glow}
            color={tailColor}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>
        <sprite scale={[0.004, 0.004, 1]} renderOrder={5}>
          <spriteMaterial
            map={core}
            color={coreColor}
            transparent
            depthWrite={false}
          />
        </sprite>
      </group>

      <mesh ref={ring} visible={false} renderOrder={4}>
        <planeGeometry args={[0.028, 0.028]} />
        <shaderMaterial
          ref={ringMaterial}
          vertexShader={RING_VERTEX}
          fragmentShader={RING_FRAGMENT}
          uniforms={ringUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function AirportMarker({
  position,
  color,
  ringColor,
}: {
  readonly position: Vec3;
  readonly color: Color;
  readonly ringColor: Color;
}) {
  const dot = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);

  useFrame((state) => {
    const { beat } = readScroll();
    const shown = beat !== "hero" && beat !== "demo";
    if (dot.current !== null) {
      orientOnSurface(dot.current, position, 0.0015);
      const d = state.camera.position.distanceTo(dot.current.position);
      dot.current.scale.setScalar((d * DOT_ANGLE) / DOT_RADIUS);
      dot.current.visible = shown;
    }
    if (halo.current !== null) {
      orientOnSurface(halo.current, position, 0.001);
      const d = state.camera.position.distanceTo(halo.current.position);
      halo.current.scale.setScalar((d * SIGNAL_ANGLE) / SIGNAL_RING);
      halo.current.visible = shown;
    }
  });

  return (
    <group>
      <mesh ref={dot} renderOrder={2}>
        <circleGeometry args={[DOT_RADIUS, 24]} />
        <meshBasicMaterial color={color} depthWrite={false} />
      </mesh>
      {/* The ring of signal: where the device has coverage (STORYBOARD beats 02 and 06). */}
      <mesh ref={halo} renderOrder={2}>
        <ringGeometry args={[SIGNAL_RING, SIGNAL_RING + 0.0008, 64]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

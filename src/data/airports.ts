/**
 * The airports the generic day flies between.
 *
 * Coordinates from `mwgg/Airports` (https://github.com/mwgg/Airports), which
 * the Phoenix app also carries as `src/geo/airports.json`. The dataset is MIT
 * licensed; the notice below is reproduced as the licence requires and
 * repeated in the page footer's credit line.
 *
 *   MIT License
 *   Copyright (c) 2018 mwgg
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the "Software"),
 *   to deal in the Software without restriction, including without limitation
 *   the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *   and/or sell copies of the Software, and to permit persons to whom the
 *   Software is furnished to do so, subject to the following conditions: The
 *   above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED
 *   "AS IS", WITHOUT WARRANTY OF ANY KIND.
 *
 * A white-label variant supplies its own list (BRIEF §6, optional items), with
 * that airline's written permission for anything that names it.
 */

import type { GeoPoint } from "@/lib/day/geo";

export interface Airport extends GeoPoint {
  /** IATA code, the one crews say. */
  readonly code: string;
  readonly icao: string;
  readonly name: string;
  readonly city: string;
}

export const AIRPORTS = {
  IST: {
    code: "IST",
    icao: "LTFM",
    name: "Istanbul Airport",
    city: "Istanbul",
    lat: 41.2622,
    lon: 28.7278,
  },
  CAI: {
    code: "CAI",
    icao: "HECA",
    name: "Cairo International Airport",
    city: "Cairo",
    lat: 30.1219,
    lon: 31.4056,
  },
  AMM: {
    code: "AMM",
    icao: "OJAI",
    name: "Queen Alia International Airport",
    city: "Amman",
    lat: 31.7226,
    lon: 35.9932,
  },
} as const satisfies Record<string, Airport>;

export type AirportCode = keyof typeof AIRPORTS;

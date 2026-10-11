import { describe, expect, it } from "vitest";

import { validateLead } from "./validate";

const good = {
  name: "A. Pilot",
  email: "a.pilot@example-air.com",
  airline: "Example Air",
  role: "Director of Flight Operations",
  fleetSize: "12",
  message: "A320 family, two bases.",
};

describe("validateLead", () => {
  it("accepts a complete request and trims it", () => {
    const result = validateLead({ ...good, name: "  A. Pilot  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lead.name).toBe("A. Pilot");
  });

  it("requires name, email, airline and role", () => {
    const result = validateLead({});
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(Object.keys(result.errors).sort()).toEqual([
        "airline",
        "email",
        "name",
        "role",
      ]);
  });

  it("rejects a malformed email", () => {
    for (const email of [
      "pilot",
      "pilot@",
      "pilot@air",
      "pilot @air.com",
      "pilot@air.c",
    ]) {
      const result = validateLead({ ...good, email });
      expect(result.ok, email).toBe(false);
    }
  });

  it("strips control characters and caps lengths", () => {
    const result = validateLead({
      ...good,
      message: "x".repeat(5000) + "\u0000",
      name: "A\r\nB",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lead.message.length).toBe(4000);
      expect(result.lead.name).toBe("A\r\nB");
    }
  });

  it("ignores non-string values", () => {
    const result = validateLead({ ...good, fleetSize: 12 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lead.fleetSize).toBe("");
  });
});

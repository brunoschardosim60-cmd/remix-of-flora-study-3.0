import { describe, expect, it } from "vitest";
import AnamnesisSimulatorDefault, { AnamnesisSimulator } from "./AnamnesisSimulator";

describe("AnamnesisSimulator module contract", () => {
  it("exposes the named component expected by the lazy medicine route", () => {
    expect(AnamnesisSimulator).toBeTypeOf("function");
    expect(AnamnesisSimulatorDefault).toBe(AnamnesisSimulator);
  });
});

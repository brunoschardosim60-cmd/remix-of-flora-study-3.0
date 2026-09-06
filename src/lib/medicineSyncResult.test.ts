import { describe, expect, it } from "vitest";
import { confirmMedicineProgressWrite, requireMedicineProgressRead } from "./medicineSyncResult";

describe("medicine progress acknowledgement", () => {
  it("does not treat a failed read as an empty new account", () => {
    expect(() => requireMedicineProgressRead({ data: null, error: { message: "permission denied" } })).toThrow("permission denied");
    expect(requireMedicineProgressRead({ data: null, error: null })).toBeNull();
  });
  it("rejects unconfirmed and wrong-account writes", () => {
    expect(() => confirmMedicineProgressWrite({ data: null, error: null }, "a")).toThrow();
    expect(() => confirmMedicineProgressWrite({ data: { user_id: "b" }, error: null }, "a")).toThrow();
    expect(() => confirmMedicineProgressWrite({ data: { user_id: "a" }, error: { message: "offline" } }, "a")).toThrow();
  });
  it("accepts the row returned for the current account", () => {
    expect(() => confirmMedicineProgressWrite({ data: { user_id: "a" }, error: null }, "a")).not.toThrow();
  });
});

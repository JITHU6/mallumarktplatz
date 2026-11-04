import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, sanitize } from "@/lib/logger";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("redacts secrets and personal data", () => {
    expect(
      sanitize({ password: "x", access_token: "t", email: "a@b.de", contact_phone: "1", nested: { Authorization: "Bearer" }, user_id: "u1" }),
    ).toEqual({
      password: "[redacted]",
      access_token: "[redacted]",
      email: "[redacted]",
      contact_phone: "[redacted]",
      nested: { Authorization: "[redacted]" },
      user_id: "u1",
    });
  });

  it("serialises errors with Postgres codes", () => {
    const err = Object.assign(new Error("duplicate key"), { code: "23505" });
    expect(sanitize(err)).toMatchObject({ name: "Error", message: "duplicate key", code: "23505" });
  });

  it("writes one JSON line per entry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom", { action: "x", password: "secret" });
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ level: "error", message: "boom", action: "x", password: "[redacted]", service: "mallumarktplatz" });
    expect(entry.timestamp).toBeTruthy();
  });
});

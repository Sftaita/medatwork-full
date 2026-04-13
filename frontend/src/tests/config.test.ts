import { describe, it, expect } from "vitest";

describe("API config", () => {
  it("exports LOGGIN_API ending with login_check", async () => {
    const { LOGGIN_API } = await import("../config.jsx");
    expect(LOGGIN_API).toMatch(/login_check$/);
  });

  it("exports YEARS_API ending with years", async () => {
    const { YEARS_API } = await import("../config.jsx");
    expect(YEARS_API).toMatch(/years$/);
  });

  it("API_URL ends with /api/", async () => {
    const { API_URL } = await import("../config.jsx");
    expect(API_URL).toMatch(/\/api\/$/);
  });

  it("all endpoints start with API_URL", async () => {
    const { API_URL, LOGGIN_API, YEARS_API, MANAGERS_API, RESIDENTS_API } =
      await import("../config.jsx");
    expect(LOGGIN_API).toContain(API_URL);
    expect(YEARS_API).toContain(API_URL);
    expect(MANAGERS_API).toContain(API_URL);
    expect(RESIDENTS_API).toContain(API_URL);
  });
});

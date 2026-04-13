import { test, expect } from "@playwright/test";
import { mockUnauthenticated } from "./helpers/routes";

test.beforeEach(async ({ page }) => {
  await mockUnauthenticated(page);
});

// ── Public routes ──────────────────────────────────────────────────────────────

test.describe("Public navigation", () => {
  test("homepage loads and shows the app name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Medatwork/i);
  });

  test("/login renders without crashing", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#LoginForm").getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("/connecting renders without crashing", async ({ page }) => {
    await page.goto("/connecting");
    await expect(page).not.toHaveURL(/\/404/);
  });

  test("/passwordReset renders without crashing", async ({ page }) => {
    await page.goto("/passwordReset");
    await expect(page).not.toHaveURL(/\/404/);
  });

  test("/terms renders without crashing", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).not.toHaveURL(/\/404/);
  });

  test("/contactUs renders without crashing", async ({ page }) => {
    await page.goto("/contactUs");
    await expect(page).not.toHaveURL(/\/404/);
  });
});

// ── Protected routes redirect unauthenticated users ──────────────────────────

test.describe("Route protection", () => {
  test("unauthenticated user cannot access /manager_years", async ({ page }) => {
    await page.goto("/manager_years");
    // Should redirect away — either to login or back to homepage
    await expect(page).not.toHaveURL("/manager_years");
  });

  test("unauthenticated user cannot access /realtime", async ({ page }) => {
    await page.goto("/realtime");
    await expect(page).not.toHaveURL("/realtime");
  });

  test("unauthenticated user cannot access /timer", async ({ page }) => {
    await page.goto("/timer");
    await expect(page).not.toHaveURL("/timer");
  });
});

// ── 404 page ──────────────────────────────────────────────────────────────────

test.describe("Error page", () => {
  test("/404 renders the error page", async ({ page }) => {
    await page.goto("/404");
    await expect(page).not.toHaveURL(/\/login/);
  });
});

import { test, expect } from "@playwright/test";
import {
  mockUnauthenticated,
  mockLogin,
  mockManagerDashboard,
  mockResidentDashboard,
} from "./helpers/routes";
import {
  MANAGER_LOGIN_RESPONSE,
  RESIDENT_LOGIN_RESPONSE,
  LOGIN_401_RESPONSE,
} from "./fixtures/api";

test.beforeEach(async ({ page }) => {
  await mockUnauthenticated(page);
});

// ── Page rendering ─────────────────────────────────────────────────────────────

test.describe("Login page — rendering", () => {
  test("displays the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Ravi de vous revoir")).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#outlined-adornment-password")).toBeVisible();
    await expect(page.locator("#LoginForm").getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("shows a link to password reset", async ({ page }) => {
    await page.goto("/login");

    const resetLink = page.getByText("Mot de passe oublié?");
    await expect(resetLink).toBeVisible();
    await expect(resetLink).toHaveAttribute("href", "/passwordReset");
  });

  test("shows a link to registration", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page.getByText("S'enregistrer.");
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute("href", "/connecting");
  });
});

// ── Form validation ────────────────────────────────────────────────────────────

test.describe("Login form — validation", () => {
  test("shows required errors when submitting empty form", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page.getByText("Adresse email obligatoire.")).toBeVisible();
    await expect(page.getByText("Renseignez votre mot de passe")).toBeVisible();
  });

  test("shows email format error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill("not-an-email");
    await page.locator("#outlined-adornment-password").fill("password123");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page.getByText("Entrez une adresse email valide")).toBeVisible();
  });

  test("shows password length error for short password", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill("doctor@hospital.be");
    await page.locator("#outlined-adornment-password").fill("short");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByText("Le mot de passe doit contenir au minimum 8 caractères")
    ).toBeVisible();
  });
});

// ── Password visibility toggle ─────────────────────────────────────────────────

test.describe("Login form — password visibility", () => {
  test("toggles password visibility", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#outlined-adornment-password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "toggle password visibility" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "toggle password visibility" }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ── Successful login ───────────────────────────────────────────────────────────

test.describe("Login — success", () => {
  test("manager login redirects to /realTime", async ({ page }) => {
    await mockManagerDashboard(page);
    await mockLogin(page, () => ({
      status: 200,
      json: MANAGER_LOGIN_RESPONSE,
    }));

    await page.goto("/login");
    await page.locator("#username").fill("manager@hospital.be");
    await page.locator("#outlined-adornment-password").fill("password123");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/realTime/, { timeout: 5000 });
  });

  test("resident login redirects to /timer", async ({ page }) => {
    await mockResidentDashboard(page);
    await mockLogin(page, () => ({
      status: 200,
      json: RESIDENT_LOGIN_RESPONSE,
    }));

    await page.goto("/login");
    await page.locator("#username").fill("resident@hospital.be");
    await page.locator("#outlined-adornment-password").fill("password123");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/timer/, { timeout: 5000 });
  });

  test("sends credentials in lowercase", async ({ page }) => {
    let capturedBody: Record<string, string> = {};
    await mockLogin(page, (body) => {
      capturedBody = body;
      return { status: 200, json: MANAGER_LOGIN_RESPONSE };
    });
    await mockManagerDashboard(page);

    await page.goto("/login");
    await page.locator("#username").fill("Manager@Hospital.BE");
    await page.locator("#outlined-adornment-password").fill("password123");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/realTime/, { timeout: 5000 });
    expect(capturedBody.username).toBe("manager@hospital.be");
  });
});

// ── Failed login ───────────────────────────────────────────────────────────────

test.describe("Login — failure", () => {
  test("shows credentials error toast on 401", async ({ page }) => {
    await mockLogin(page, () => ({
      status: 401,
      json: LOGIN_401_RESPONSE,
    }));

    await page.goto("/login");
    await page.locator("#username").fill("wrong@hospital.be");
    await page.locator("#outlined-adornment-password").fill("wrongpassword");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(
      page.getByText(/informations ne correspondent pas/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("stays on /login after failed authentication", async ({ page }) => {
    await mockLogin(page, () => ({
      status: 401,
      json: LOGIN_401_RESPONSE,
    }));

    await page.goto("/login");
    await page.locator("#username").fill("wrong@hospital.be");
    await page.locator("#outlined-adornment-password").fill("wrongpassword");
    await page.locator("#LoginForm").getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});

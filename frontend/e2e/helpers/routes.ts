import type { Page } from "@playwright/test";

/**
 * Intercepts the token/refresh endpoint and returns 401.
 * Call this at the start of every test to prevent PersistLogin
 * from treating the browser as an already-authenticated session.
 */
export async function mockUnauthenticated(page: Page) {
  await page.route("**/token/refresh", (route) =>
    route.fulfill({ status: 401, json: { message: "Unauthenticated" } })
  );
}

/**
 * Intercepts the login endpoint with a custom handler.
 */
export async function mockLogin(
  page: Page,
  handler: (body: Record<string, string>) => { status: number; json: unknown }
) {
  await page.route("**/login_check", async (route) => {
    const body = route.request().postDataJSON() as Record<string, string>;
    const { status, json } = handler(body);
    await route.fulfill({ status, json });
  });
}

/**
 * Intercepts all manager dashboard API calls with empty-but-valid responses.
 * Prevents pages from crashing after a successful login redirect.
 */
export async function mockManagerDashboard(page: Page) {
  await page.route("**/managers/statistics/**", (route) =>
    route.fulfill({ status: 200, json: { statistics: [], residents: [] } })
  );
  await page.route("**/managers/years/**", (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route("**/managers/notifications/**", (route) =>
    route.fulfill({ status: 200, json: [] })
  );
}

/**
 * Intercepts all resident dashboard API calls with empty-but-valid responses.
 */
export async function mockResidentDashboard(page: Page) {
  await page.route("**/years/getResidentYears", (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route("**/residents/timesheets/**", (route) =>
    route.fulfill({ status: 200, json: { statistics: [], years: [] } })
  );
  await page.route("**/residents/notifications/**", (route) =>
    route.fulfill({ status: 200, json: [] })
  );
}

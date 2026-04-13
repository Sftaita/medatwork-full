/**
 * Mock API responses used across E2E tests.
 * Mirrors the real backend contract without requiring a running server.
 */

export const MANAGER_LOGIN_RESPONSE = {
  token: "eyJhbGciOiJSUzI1NiJ9.mock-manager-token",
  firstname: "Marie",
  lastname: "Dupont",
  role: "manager",
  gender: "F",
  id: 1,
};

export const RESIDENT_LOGIN_RESPONSE = {
  token: "eyJhbGciOiJSUzI1NiJ9.mock-resident-token",
  firstname: "Jean",
  lastname: "Martin",
  role: "resident",
  gender: "M",
  id: 2,
};

export const LOGIN_401_RESPONSE = {
  code: 401,
  message: "Invalid credentials.",
};

export const LOGIN_400_RESPONSE = {
  code: 400,
  message: "Bad request.",
};

// Manager years list for post-login dashboard
export const MANAGER_YEARS_RESPONSE = [
  { id: 1, title: "Année 2023-2024", location: "CHU Bruxelles" },
];

// Resident years list
export const RESIDENT_YEARS_RESPONSE = [
  { id: 1, title: "Année 2023-2024", yearToken: "abc123" },
];

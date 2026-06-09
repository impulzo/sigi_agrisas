import { Page } from "@playwright/test";

export const PASSWORD = "E2eTest1234!";

export async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|inventory|catalogs)/, { timeout: 10000 });
}

export async function logout(page: Page) {
  const logoutBtn = page.getByTitle("Cerrar sesión");
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
  }
}

import { expect, test } from "@playwright/test";

// Captures the onboarding screens at the mobile viewport. Doubles as a CI
// artifact source for PR screenshots.
test("capture onboarding screens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/welcome.png" });

  await page.getByRole("button", { name: /get started/i }).click();
  await expect(page.getByRole("button", { name: /set up a new course/i })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/role.png" });

  await page.getByRole("button", { name: /join a race committee/i }).click();
  await expect(page.getByPlaceholder("e.g. 7QK2P")).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/join.png" });
});

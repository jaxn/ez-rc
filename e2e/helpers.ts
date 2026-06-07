import { devices, expect, type Page } from "@playwright/test";

/**
 * Modern mobile device profile used for all e2e runs and screenshots — this is
 * a phone-first app used on the water, so we test/capture at a phone viewport
 * (Pixel 7: 412×915, chromium-based) rather than a desktop size.
 */
export const MOBILE_DEVICE = devices["Pixel 7"];

/** Walk the welcome → role steps, then create a new course (flag boat). */
export async function createSession(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByRole("button", { name: /set up a new course/i }).click();
  const chip = page.getByTestId("session-code");
  await expect(chip).toBeVisible();
  const code = (await chip.textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  return code;
}

/** Walk the welcome → role → code steps to join an existing session. */
export async function joinSession(page: Page, code: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByRole("button", { name: /join a race committee/i }).click();
  await page.getByPlaceholder("e.g. 7QK2P").fill(code);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByTestId("session-code")).toHaveText(code);
}

/** Wait until a GPS fix has enabled the mark-drop buttons. */
export async function waitForFix(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Windward" })).toBeEnabled();
}

/** Read the map's current compass bearing, normalized to [0, 360). */
export async function getMapBearing(page: Page): Promise<number> {
  const raw = await page.evaluate(() => {
    const w = window as unknown as { __ezrcMap?: { getBearing(): number } };
    return w.__ezrcMap ? w.__ezrcMap.getBearing() : NaN;
  });
  return ((raw % 360) + 360) % 360;
}

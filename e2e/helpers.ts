import { devices, expect, type Page } from "@playwright/test";

/**
 * Modern mobile device profile used for all e2e runs and screenshots — this is
 * a phone-first app used on the water, so we test/capture at a phone viewport
 * (Pixel 7: 412×915, chromium-based) rather than a desktop size.
 */
export const MOBILE_DEVICE = devices["Pixel 7"];

/** Create a brand-new session and wait for the map screen. Returns the code. */
export async function createSession(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.getByPlaceholder("e.g. Flag Boat").fill(name);
  await page.getByRole("button", { name: "Create new session" }).click();
  const chip = page.getByTestId("session-code");
  await expect(chip).toBeVisible();
  const code = (await chip.textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  return code;
}

/** Join an existing session by code and wait for the map screen. */
export async function joinSession(page: Page, name: string, code: string): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("e.g. Flag Boat").fill(name);
  await page.getByPlaceholder("e.g. 7QK2P").fill(code);
  await page.getByRole("button", { name: "Join session" }).click();
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

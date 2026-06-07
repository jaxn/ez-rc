import { expect, test } from "@playwright/test";
import { createSession, getMapBearing, waitForFix } from "./helpers";

const HAMILTON_CREEK = { latitude: 36.108, longitude: -86.627 };
// ~0.9 nm north — within the typical 0.5–1.2 nm course-leg range.
const WINDWARD = { latitude: 36.108 + 0.9 / 60, longitude: -86.627 };

test("set a course: flag boat, marks, course leg, and wind-up rotation", async ({
  page,
  context,
}) => {
  await context.setGeolocation(HAMILTON_CREEK);
  await createSession(page);
  await waitForFix(page);

  // Creating a course auto-designates this device as the flag boat.
  await expect(page.getByRole("button", { name: /I'm the flag boat/ })).toBeVisible();

  // Drop the leeward mark here, then move ~0.9 nm north and drop the windward.
  await page.getByRole("button", { name: "Leeward" }).click();
  await context.setGeolocation(WINDWARD);
  await page.getByRole("button", { name: "Windward" }).click();

  // The course leg should now appear, measured in nautical miles.
  const leg = page.getByTestId("course-leg");
  await expect(leg).toBeVisible();
  await expect(leg).toContainText("nm");

  // Set the wind from 270° and confirm the map rotates so wind is at the top.
  await page.getByRole("button", { name: "🧭 Wind" }).click();
  await page.getByPlaceholder("0–360").fill("270");
  await page.getByRole("button", { name: "Set wind" }).click();

  await expect(page.getByTestId("wind-readout")).toContainText("270");
  await expect
    .poll(async () => Math.abs((await getMapBearing(page)) - 270) < 3, { timeout: 5000 })
    .toBe(true);

  // Capture the fully-set course (uploaded as a CI artifact).
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/screenshots/course-set.png", fullPage: false });
});

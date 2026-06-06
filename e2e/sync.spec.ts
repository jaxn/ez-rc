import { expect, test } from "@playwright/test";
import { createSession, joinSession, waitForFix } from "./helpers";

// Two browser contexts = two devices on the same session over the WebSocket relay.
test("two devices join one session and see each other relative to the flag boat", async ({
  browser,
}) => {
  const flagCtx = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 36.108, longitude: -86.627 },
  });
  const markCtx = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 36.118, longitude: -86.627 }, // ~0.6 nm north
  });
  const flag = await flagCtx.newPage();
  const markBoat = await markCtx.newPage();

  const code = await createSession(flag, "Flag Boat");
  await waitForFix(flag);

  await joinSession(markBoat, "Mark Boat", code);
  await waitForFix(markBoat);

  // Flag Boat designates itself as the flag boat; the change propagates.
  await flag.getByRole("button", { name: /flag boat/i }).click();

  // Both devices now show two boats in the roster.
  await expect(flag.getByRole("button", { name: /Boats \(2\)/ })).toBeVisible();
  await expect(markBoat.getByRole("button", { name: /Boats \(2\)/ })).toBeVisible();

  // The mark boat shows its distance from the flag boat in nautical miles.
  await expect(markBoat.locator(".device .rel", { hasText: "nm" }).first()).toBeVisible();

  await flagCtx.close();
  await markCtx.close();
});

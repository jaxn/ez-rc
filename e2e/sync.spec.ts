import { expect, test } from "@playwright/test";
import { createSession, joinSession, MOBILE_DEVICE, waitForFix } from "./helpers";

// Two browser contexts = two devices on the same session over the WebSocket relay.
test("two devices join one session and see each other relative to the flag boat", async ({
  browser,
}) => {
  const flagCtx = await browser.newContext({
    ...MOBILE_DEVICE,
    permissions: ["geolocation"],
    geolocation: { latitude: 36.108, longitude: -86.627 },
  });
  const markCtx = await browser.newContext({
    ...MOBILE_DEVICE,
    permissions: ["geolocation"],
    geolocation: { latitude: 36.118, longitude: -86.627 }, // ~0.6 nm north
  });
  const flag = await flagCtx.newPage();
  const markBoat = await markCtx.newPage();

  const code = await createSession(flag);
  await waitForFix(flag);

  await joinSession(markBoat, code);
  await waitForFix(markBoat);

  // Creating the course auto-designates the flag boat; the change propagates.
  // Both devices now show two boats in the roster.
  await expect(flag.getByRole("button", { name: /Boats \(2\)/ })).toBeVisible();
  await expect(markBoat.getByRole("button", { name: /Boats \(2\)/ })).toBeVisible();

  // The mark boat shows its distance from the flag boat in nautical miles.
  await expect(markBoat.locator(".device .rel", { hasText: "nm" }).first()).toBeVisible();

  await flagCtx.close();
  await markCtx.close();
});

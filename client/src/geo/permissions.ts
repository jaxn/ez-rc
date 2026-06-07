/**
 * Device-permission requests triggered from a user gesture (the "Get started"
 * button). Geolocation permission is prompted separately by starting the
 * position watch; this module covers notifications.
 */

export type NotificationOutcome = NotificationPermission | "unsupported";

/** Ask for notification permission if supported and not already decided. */
export async function requestNotificationPermission(): Promise<NotificationOutcome> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return "denied";
  }
}

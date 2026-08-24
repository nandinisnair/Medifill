/**
 * Notification Service — Local push notifications via expo-notifications.
 *
 * Schedules daily reminders for each medicine at its configured times.
 * Works seamlessly in Expo Go and standalone builds on both iOS and Android.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// ── Configure how notifications appear when the app is in the foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Setup Android notification channel.
 * Wrapped in try-catch with graceful failure because Expo Go on Android manages
 * its own internal notification channel ("Miscellaneous") and rejects custom channels.
 */
async function setupAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    if (typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('medicine_reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch {
    // Expo Go handles notifications via the default system channel.
    // This is non-blocking so permissions and scheduling continue unimpeded.
  }
}

// ── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    // 1. Check existing permission status
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    // 2. If not already granted, request permission from user
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    // 3. Attempt channel creation safely in background without blocking
    if (Platform.OS === 'android') {
      setupAndroidNotificationChannel().catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn('requestNotificationPermissions non-fatal error:', error);
    return false;
  }
}

// ── Schedule / Cancel ────────────────────────────────────────────────────────

export interface MedicineReminder {
  medicineId: string;
  medicineName: string;
  dosage: string;
  times: string[]; // ['08:00', '20:00']
}

/**
 * Schedule daily repeating notifications for a medicine.
 * Each time slot gets its own notification identifier so they can
 * be individually cancelled later.
 */
export async function scheduleMedicineReminders(reminder: MedicineReminder) {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    if (!reminder.times || !Array.isArray(reminder.times)) return;

    for (const time of reminder.times) {
      if (!time || typeof time !== 'string' || !time.includes(':')) continue;

      const [hoursStr, minutesStr] = time.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        continue;
      }

      const identifier = `med-${reminder.medicineId}-${time}`;

      // Cancel any existing notification with this id first
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: '💊 Time for your medicine',
          body: `Take ${reminder.medicineName} (${reminder.dosage})`,
          data: { medicineId: reminder.medicineId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  } catch (error) {
    console.warn('scheduleMedicineReminders non-fatal error:', error);
  }
}

/**
 * Cancel all reminders for a specific medicine.
 */
export async function cancelMedicineReminders(medicineId: string, times: string[]) {
  if (Platform.OS === 'web') return;

  if (!times || !Array.isArray(times)) return;

  for (const time of times) {
    const identifier = `med-${medicineId}-${time}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  }
}

/**
 * Cancel every scheduled notification (e.g. on sign-out).
 */
export async function cancelAllReminders() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  } catch (error) {
    console.warn('cancelAllReminders error:', error);
  }
}

/**
 * Fire an immediate local notification (e.g. for testing, low-stock or expiry warnings).
 */
export async function sendInstantNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // null fires immediately
    });
  } catch (error) {
    console.warn('sendInstantNotification non-fatal error:', error);
  }
}

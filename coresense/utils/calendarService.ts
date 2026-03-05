import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

export interface CalendarEventInput {
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export interface FreeSlot {
  start: Date;
  end: Date;
}

let _permissionGranted: boolean | null = null;

/** Request calendar read + write permissions. Returns true if granted. */
export async function requestCalendarPermissions(): Promise<boolean> {
  if (_permissionGranted !== null) return _permissionGranted;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  _permissionGranted = status === 'granted';
  return _permissionGranted;
}

/** Get the default writable calendar ID for the current device. */
async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return defaultCalendar?.id ?? null;
    }

    // Android: find first local writable calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find(
      (cal) =>
        cal.allowsModifications &&
        cal.source?.type !== Calendar.SourceType.SUBSCRIBED
    );
    return writable?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Find the earliest free block of at least `durationMinutes` on `date`.
 * Working window: 8am–9pm. Applies a 15-minute buffer around existing events.
 *
 * @param date             Target day
 * @param durationMinutes  Required block length
 * @param preferredHour    Optional preferred start hour (0-23). Search begins here
 *                         instead of 8am so the slot is as close as possible.
 * @returns A free slot, or null when no gap fits.
 */
export async function findBestSlot(
  date: Date,
  durationMinutes: number,
  preferredHour?: number
): Promise<FreeSlot | null> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) return null;

    // Scan window: 6am–11pm (wider than working window to detect edge events)
    const scanStart = new Date(date);
    scanStart.setHours(6, 0, 0, 0);
    const scanEnd = new Date(date);
    scanEnd.setHours(23, 0, 0, 0);

    // Working window: 8am–9pm
    const workStart = new Date(date);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(date);
    workEnd.setHours(21, 0, 0, 0);

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarIds = calendars.map((c) => c.id);

    const events = await Calendar.getEventsAsync(calendarIds, scanStart, scanEnd);

    // Filter to only events that overlap the working window, then sort
    const sorted = events
      .filter((e) => {
        const eEnd = new Date(e.endDate).getTime();
        const eStart = new Date(e.startDate).getTime();
        return eEnd > workStart.getTime() && eStart < workEnd.getTime();
      })
      .sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

    const BUFFER_MS = 15 * 60 * 1000;
    const durationMs = durationMinutes * 60 * 1000;

    // If a preferred hour is given and falls within the working window, start there
    let anchorTime = workStart.getTime();
    if (preferredHour !== undefined) {
      const preferred = new Date(date);
      preferred.setHours(preferredHour, 0, 0, 0);
      const prefMs = preferred.getTime();
      if (prefMs >= workStart.getTime() && prefMs + durationMs <= workEnd.getTime()) {
        anchorTime = prefMs;
      }
    }

    // Helper: find the first gap starting from `cursorStart`
    const findGap = (cursorStart: number): FreeSlot | null => {
      let cursor = cursorStart;
      for (const event of sorted) {
        const evStart = new Date(event.startDate).getTime() - BUFFER_MS;
        const evEnd = new Date(event.endDate).getTime() + BUFFER_MS;

        if (evEnd <= cursor) continue; // event is before our cursor

        if (evStart - cursor >= durationMs && cursor + durationMs <= workEnd.getTime()) {
          return { start: new Date(cursor), end: new Date(cursor + durationMs) };
        }

        if (evEnd > cursor) cursor = evEnd;
      }

      // Check remaining time after all events
      if (cursor + durationMs <= workEnd.getTime()) {
        return { start: new Date(cursor), end: new Date(cursor + durationMs) };
      }
      return null;
    };

    // Try from preferred anchor first
    const slotFromAnchor = findGap(anchorTime);
    if (slotFromAnchor) return slotFromAnchor;

    // If preferred anchor was after workStart, retry from workStart
    if (anchorTime > workStart.getTime()) {
      const slotFromStart = findGap(workStart.getTime());
      if (slotFromStart) return slotFromStart;
    }

    // No slot available
    return null;
  } catch {
    return null;
  }
}

/** Create a native calendar event. Returns the event ID or null on failure. */
export async function addEventToCalendar(event: CalendarEventInput): Promise<string | null> {
  try {
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert('Calendar Error', 'No writable calendar found on this device.');
      return null;
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      notes: event.notes,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return eventId;
  } catch (err: any) {
    console.error('addEventToCalendar error:', err);
    return null;
  }
}

/**
 * High-level: request permissions → find best slot → create event.
 *
 * @param title            Event title
 * @param targetDate       Date object representing the target day
 * @param durationMinutes  Duration in minutes (default 60)
 * @param preferredTime    "HH:MM" 24h anchor time – search starts here when possible
 * @param notes            Optional notes
 */
export async function scheduleWithSmartGap(
  title: string,
  targetDate: Date,
  durationMinutes: number = 60,
  preferredTime?: string,
  notes?: string
): Promise<{ success: boolean; slotUsed?: FreeSlot; error?: string }> {
  const granted = await requestCalendarPermissions();
  if (!granted) {
    return { success: false, error: 'Calendar permission not granted.' };
  }

  // Parse preferred time into an hour for findBestSlot
  let preferredHour: number | undefined;
  if (preferredTime) {
    const [h, m] = preferredTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      preferredHour = h;
    }
  }

  const slot = await findBestSlot(targetDate, durationMinutes, preferredHour);
  if (!slot) {
    return { success: false, error: 'No free slot available on this day.' };
  }

  const eventId = await addEventToCalendar({
    title,
    startDate: slot.start,
    endDate: slot.end,
    notes,
  });

  if (!eventId) {
    return { success: false, error: 'Failed to create calendar event.' };
  }

  return { success: true, slotUsed: slot };
}

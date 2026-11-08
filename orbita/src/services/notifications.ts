/**
 * Local reminders using the browser Notification API.
 * Works while the app is open (or installed as PWA and running). There is no push server,
 * so reminders are not delivered when the app is fully closed.
 */
import { toast } from '../components/toast';
import { isValidTime, nowMin, toMin, todayISO } from '../domain/dates';
import { isDoneOn, occursOn } from '../domain/tasks';
import { useStore } from '../store/useStore';

export const notifSupported = typeof window !== 'undefined' && 'Notification' in window;

export async function requestPermission(): Promise<boolean> {
  if (!notifSupported) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title: string, body: string) {
  toast(`🔔 ${title}: ${body}`);
  if (notifSupported && Notification.permission === 'granted' && useStore.getState().settings.notifications) {
    try { new Notification(title, { body, icon: '/icon-192.png', tag: title + body }); } catch { /* some mobile browsers require a service worker */ }
  }
}

const fired = new Set<string>();
function tick() {
  const { tasks, settings } = useStore.getState();
  if (!settings.notifications) return;
  const today = todayISO(), now = nowMin();
  for (const t of tasks) {
    if (t.reminder === undefined || !isValidTime(t.start) || !occursOn(t, today) || isDoneOn(t, today)) continue;
    const at = toMin(t.start) - t.reminder;
    const key = `${t.id}:${today}`;
    if (now >= at && now <= toMin(t.start) + 1 && !fired.has(key)) {
      fired.add(key);
      notify(t.reminder ? `Em ${t.reminder} min` : 'Agora', `${t.title} às ${t.start}`);
    }
  }
}

export function startReminders() {
  tick();
  return setInterval(tick, 30_000);
}

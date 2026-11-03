import { t as translate } from '../../app/i18n/language';
import EmptyState from '../../shared/empty-state/EmptyState';
import type { ActivityEvent } from '../../api';
import s from './Activity.module.css';

export default function ActivityLog({ events }: { events: ActivityEvent[] }) {
  const ordered = [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <>
      {ordered.map((event, index) => {
        const day = activityDate(event.createdAt);
        const previousDay = index ? activityDate(ordered[index - 1].createdAt) : '';
        return (
          <div className={`${s.entry} ${index === ordered.length - 1 ? s.lastActivity : ''}`} key={event.id}>
            {day !== previousDay && (
              <p className={`${s.date} ${s.logDate}`}>
                {new Date(`${day}T12:00:00`).toLocaleDateString(typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en-GB' : 'vi-VN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                }).replace(/^ngày\s+/u, '')}
              </p>
            )}
            <div className={`${s.activityRow} ${s.eventRow}`}>
              <span className={s.eventIcon} aria-hidden="true">✎</span>
              <div className={s.activityInfo}>
                <strong>{event.summary}</strong>
                <p>
                  {event.actorName} · {new Date(event.createdAt).toLocaleTimeString(typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en-GB' : 'vi-VN', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      {!ordered.length && <EmptyState><p>{translate("Chưa có hoạt động nào.")}</p></EmptyState>}
    </>
  );
}

function activityDate(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

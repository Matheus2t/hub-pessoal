import { apiUrl } from './config';
import type { SportsSection, SectionName, Team } from './sports';

interface Overview { season: string; sections?: Partial<Record<SectionName, SportsSection>> }
const cache = new Map<Team, { until: number; data: Overview }>();
const pending = new Map<Team, Promise<Overview>>();

/** Shared across route components: navigating away does not restart the same request. */
export async function loadOverview(team: Team): Promise<Overview> {
  const hit = cache.get(team);
  if (hit && hit.until > Date.now()) return hit.data;
  const running = pending.get(team);
  if (running) return running;
  const request = (async () => {
    const response = await fetch(apiUrl(`/api/sports/${team}?include=all`), { signal: AbortSignal.timeout(55000) });
    if (!response.ok) throw new Error('sports overview');
    const data: Overview = await response.json();
    if (data.sections) {
      const failed = Object.values(data.sections).some(section => section && ['error', 'rate_limited'].includes(section.state));
      cache.set(team, { until: Date.now() + (failed ? 15000 : 60000), data });
    }
    return data;
  })();
  pending.set(team, request);
  try { return await request; } finally { pending.delete(team); }
}

import { useEffect, useState } from 'react';
import { PILOT_SLUG, isDemoPilot } from './config';
import { fetchDemoBaseline, type DemoBaseline } from './lib/fetchDemoBaseline';
import { setDemoCategoryOverride } from './categoryFieldMap';

type DemoCloudStatus = 'not-applicable' | 'loading' | 'ready' | 'unavailable';

interface DemoCloudBaselineState {
  status: DemoCloudStatus;
  baseline: DemoBaseline | null;
}

/**
 * Fetches this demo pilot's cloud-configured tenant/category/product
 * baseline once per page load — see fetchDemoBaseline.ts. A no-op for
 * every non-demo pilot (status stays 'not-applicable' immediately, no
 * fetch happens), so it's always safe to call unconditionally from App.tsx.
 *
 * 'unavailable' means neither a live fetch nor a cached baseline worked —
 * the caller falls back to the hardcoded demoSeeds.ts content so a demo
 * never renders fully empty.
 */
export function useDemoCloudBaseline(): DemoCloudBaselineState {
  const isDemo = isDemoPilot(PILOT_SLUG);
  const [state, setState] = useState<DemoCloudBaselineState>(() => ({
    status: isDemo ? 'loading' : 'not-applicable',
    baseline: null,
  }));

  useEffect(() => {
    if (!isDemo) return;
    let cancelled = false;

    fetchDemoBaseline(PILOT_SLUG).then((baseline) => {
      if (cancelled) return;
      if (baseline) {
        setDemoCategoryOverride(PILOT_SLUG, baseline.categoryOverride);
        setState({ status: 'ready', baseline });
      } else {
        setState({ status: 'unavailable', baseline: null });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

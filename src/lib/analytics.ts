const METRIKA_COUNTER_ID = 108472990;

type AnalyticsValue = string | number | boolean;
type AnalyticsPayload = Record<string, AnalyticsValue | null | undefined>;

interface UxfbApi {
  sendEvent: (eventName: string, attributes?: Record<string, AnalyticsValue>) => void;
}

declare global {
  interface Window {
    ym?: (
      counterId: number,
      method: "reachGoal",
      goal: string,
      params?: Record<string, AnalyticsValue>,
    ) => void;
    dataLayer?: Array<Record<string, AnalyticsValue | string>>;
    UXS?: UxfbApi;
  }
}

function cleanPayload(payload: AnalyticsPayload = {}): Record<string, AnalyticsValue> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Record<string, AnalyticsValue>;
}

export function trackEvent(goalSlug: string, payload?: AnalyticsPayload): void {
  if (typeof window === "undefined") return;

  const params = cleanPayload(payload);

  try {
    window.UXS?.sendEvent(goalSlug, params);
  } catch {
    // Ignore UXFB errors to keep product flow stable.
  }

  try {
    window.ym?.(METRIKA_COUNTER_ID, "reachGoal", goalSlug, params);
  } catch {
    // Analytics must never break the product flow.
  }

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: goalSlug, ...params });
  } catch {
    // Ignore blocked or unavailable tag-manager environments.
  }
}

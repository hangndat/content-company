/**
 * Trend detector theo domain: mặc định sports-vn; domain lạ chưa đăng ký → resolver generic (hostname).
 * Thêm domain: tạo profile mới và đưa vào `trendDomainProfiles`.
 */

export type TrendDomainProfile = {
  id: string;
  label: string;
  resolveSourceId: (url: string | undefined) => string;
  jaccardThreshold: number;
  minSources: number;
  maxBodyLength: number;
};

const DEFAULT_AGGREGATION = {
  jaccardThreshold: 0.4,
  minSources: 2,
  maxBodyLength: 3000,
} as const;

const SPORTS_VN_HOST_RULES: { match: string; sourceId: string }[] = [
  { match: "bongda24h", sourceId: "bongda24h" },
  { match: "tinthethao", sourceId: "tinthethao" },
  { match: "thethao247", sourceId: "thethao247" },
  { match: "yeuthethao", sourceId: "yeuthethao" },
  { match: "vnexpress", sourceId: "vnexpress" },
  { match: "tuoitre", sourceId: "tuoitre" },
  { match: "dantri", sourceId: "dantri" },
  { match: "zingnews", sourceId: "zingnews" },
  { match: "bongda.com", sourceId: "bongda" },
  { match: "bongdaplus", sourceId: "bongdaplus" },
  { match: "thanhnien", sourceId: "thanhnien" },
  { match: "vietnamnet", sourceId: "vietnamnet" },
  { match: "nld.com", sourceId: "nld" },
  { match: "x.com", sourceId: "x" },
  { match: "twitter.com", sourceId: "x" },
  { match: "youtube.com", sourceId: "youtube" },
  { match: "youtu.be", sourceId: "youtube" },
  { match: "facebook.com", sourceId: "facebook" },
  { match: "fb.com", sourceId: "facebook" },
  { match: "tiktok.com", sourceId: "tiktok" },
  { match: "instagram.com", sourceId: "instagram" },
];

function buildHostSubstringResolver(
  rules: { match: string; sourceId: string }[]
): (url: string | undefined) => string {
  return (url) => {
    if (!url) return "unknown";
    try {
      const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
      for (const { match, sourceId } of rules) {
        if (host.includes(match)) return sourceId;
      }
      return host.split(".")[0] ?? host;
    } catch {
      return "unknown";
    }
  };
}

function profile(
  id: string,
  label: string,
  rules: { match: string; sourceId: string }[],
  aggregation?: Partial<typeof DEFAULT_AGGREGATION>
): TrendDomainProfile {
  const agg = { ...DEFAULT_AGGREGATION, ...aggregation };
  return {
    id,
    label,
    resolveSourceId: buildHostSubstringResolver(rules),
    jaccardThreshold: agg.jaccardThreshold,
    minSources: agg.minSources,
    maxBodyLength: agg.maxBodyLength,
  };
}

export const trendDomainProfiles: Record<string, TrendDomainProfile> = {
  "sports-vn": profile("sports-vn", "Tin thể thao Việt Nam", SPORTS_VN_HOST_RULES),
  generic: profile("generic", "Đa domain (theo hostname)", [], {}),
};

export const DEFAULT_TREND_DOMAIN = "sports-vn";

export function getTrendDomainProfile(domainId: string | undefined): TrendDomainProfile {
  const id = domainId?.trim() || DEFAULT_TREND_DOMAIN;
  return trendDomainProfiles[id] ?? trendDomainProfiles.generic;
}

/** Ưu tiên sourceId từ item (RSS); không có thì map theo domain + URL. */
export function resolveTrendSourceId(
  domainId: string | undefined,
  url: string | undefined,
  explicitSourceId?: string | undefined
): string {
  const trimmed = explicitSourceId?.trim();
  if (trimmed) return trimmed;
  return getTrendDomainProfile(domainId).resolveSourceId(url);
}

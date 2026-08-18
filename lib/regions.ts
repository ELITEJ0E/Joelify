export interface Region {
  code: string
  name: string
  flag: string
  category: "asian" | "international" | "global"
}

export const ASIAN_REGIONS: Region[] = [
  { code: "MY", name: "Malaysia", flag: "🇲🇾", category: "asian" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", category: "asian" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", category: "asian" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", category: "asian" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", category: "asian" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", category: "asian" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", category: "asian" },
  { code: "JP", name: "Japan", flag: "🇯🇵", category: "asian" },
  { code: "IN", name: "India", flag: "🇮🇳", category: "asian" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", category: "asian" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", category: "asian" },
]

export const INTERNATIONAL_REGIONS: Region[] = [
  { code: "US", name: "United States", flag: "🇺🇸", category: "international" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", category: "international" },
  { code: "AU", name: "Australia", flag: "🇦🇺", category: "international" },
  { code: "CA", name: "Canada", flag: "🇨🇦", category: "international" },
  { code: "DE", name: "Germany", flag: "🇩🇪", category: "international" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", category: "international" },
]

export const FEATURED_REGIONS: Region[] = [
  { code: "MY", name: "Malaysia", flag: "🇲🇾", category: "asian" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", category: "asian" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", category: "asian" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", category: "asian" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", category: "asian" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", category: "asian" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", category: "asian" },
  { code: "JP", name: "Japan", flag: "🇯🇵", category: "asian" },
  { code: "IN", name: "India", flag: "🇮🇳", category: "asian" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", category: "asian" },
  { code: "GLOBAL", name: "Global", flag: "🌐", category: "global" },
  { code: "US", name: "United States", flag: "🇺🇸", category: "international" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", category: "international" },
]

export const ALL_REGIONS: Region[] = [
  ...ASIAN_REGIONS,
  ...INTERNATIONAL_REGIONS,
]

export function getRegion(code: string): Region {
  const upper = code?.toUpperCase() || "MY"
  if (upper === "GLOBAL") {
    return {
      code: "GLOBAL",
      name: "Global Charts",
      flag: "🌐",
      category: "global",
    }
  }
  return ALL_REGIONS.find((r) => r.code.toUpperCase() === upper) || {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    category: "asian",
  }
}

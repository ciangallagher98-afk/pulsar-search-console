// Types hand-written from a live introspection of https://trac.pulsarplatform.com/graphql

export type SearchType = "TOPICS" | "PANELS" | "CONTENTS";

export type SearchRealtimeStatus =
  | "NOT_PRESENT"
  | "SCHEDULED"
  | "STARTED"
  | "STOPPED"
  | "COMPLETED";

export type SearchHistoricStatus = string;

export const CATEGORY_VALUES = [
  "ALIEXPRESS",
  "AMAZON",
  "BAIDU",
  "BILIBILI",
  "BLOGS",
  "CH_BAIDU",
  "CHINESE_ONLINE_NEWS",
  "DARK_WEB",
  "DISCORD",
  "DOUYIN",
  "EXPEDIA",
  "FACEBOOK",
  "FIRST_PARTY_DATA",
  "FORUMS",
  "INSTAGRAM",
  "INSTAGRAM_PUBLIC",
  "KUAISHOU",
  "LINKEDIN",
  "LITTLE_RED_BOOK",
  "NAVER",
  "ONLINE_NEWS",
  "PINTEREST",
  "PODCAST",
  "PRINT_NEWS",
  "RADIO",
  "REDDIT",
  "REVIEWS",
  "SEA_FACEBOOK_PAGES",
  "SEARCH",
  "SERMO",
  "TAOBAO",
  "THREADS",
  "TIKTOK",
  "TRIPADVISOR",
  "TRUSTPILOT",
  "TUMBLR",
  "TV",
  "TWITCH",
  "X",
  "VK",
  "WECHAT",
  "WEIBO",
  "YOUTUBE",
  "ZHIHU",
] as const;
export type Category = (typeof CATEGORY_VALUES)[number];

export const HISTORIC_CATEGORY_VALUES = [
  "ALIEXPRESS",
  "AMAZON",
  "BAIDU",
  "BLOGS",
  "DARK_WEB",
  "EXPEDIA",
  "FACEBOOK",
  "FORUMS",
  "INSTAGRAM_PUBLIC",
  "LINKEDIN",
  "NAVER",
  "ONLINE_NEWS",
  "PINTEREST",
  "PODCAST",
  "PRINT_NEWS",
  "RADIO",
  "REDDIT",
  "REVIEWS",
  "SEA_FACEBOOK_PAGES",
  "SERMO",
  "TAOBAO",
  "THREADS",
  "TIKTOK",
  "TRIPADVISOR",
  "TRUSTPILOT",
  "TUMBLR",
  "TV",
  "TWITCH",
  "X",
  "VK",
  "YOUTUBE",
] as const;
export type HistoricCategory = (typeof HISTORIC_CATEGORY_VALUES)[number];

export const ONLINE_NEWS_LICENSE_VALUES = [
  "CAL_ONLINE",
  "CFC",
  "CLA",
  "LEXISNEXIS_LICENSED",
  "NLA",
  "PUBLICLY_AVAILABLE",
] as const;
export type OnlineNewsLicense = (typeof ONLINE_NEWS_LICENSE_VALUES)[number];

export const PRINT_NEWS_LICENSE_VALUES = [
  "CAL",
  "ID_ISENTIA",
  "LEXISNEXIS_LICENSED_PRINT",
  "MY_NINESTARS",
  "NLA_ECLIPS",
  "PH_NINESTARS",
  "PMCA",
  "SG_NINESTARS",
  "TH_NINESTARS",
  "VN_ISENTIA",
] as const;
export type PrintNewsLicense = (typeof PRINT_NEWS_LICENSE_VALUES)[number];

// Online and print license enum values don't overlap, so a combined filter
// UI can hold one flat list of selections and split it back out here.
export function splitLicenseValues(values: string[]): {
  online: OnlineNewsLicense[];
  print: PrintNewsLicense[];
} {
  const onlineSet = new Set<string>(ONLINE_NEWS_LICENSE_VALUES);
  const printSet = new Set<string>(PRINT_NEWS_LICENSE_VALUES);
  return {
    online: values.filter((v): v is OnlineNewsLicense => onlineSet.has(v)),
    print: values.filter((v): v is PrintNewsLicense => printSet.has(v)),
  };
}

export const BROADCAST_LICENSE_VALUES = [
  "GLOBAL_BROADCAST",
  "NO_RESTRICTION",
  "ASIA_PACIFIC",
  "AUSTRALIA",
  "THAIRATH",
  "GOVERNMENT_SKY_NEWS",
  "NON_GOVERNMENT_SKY_NEWS",
] as const;
export type BroadcastLicense = (typeof BROADCAST_LICENSE_VALUES)[number];

export type HistoricStatus =
  | "CREATED"
  | "INITIALIZING"
  | "INITIALIZED"
  | "VALIDATING"
  | "VALIDATED"
  | "COMPILING"
  | "COMPILED"
  | "PREPARED"
  | "PREPARING"
  | "PREVIEWING"
  | "PREVIEWED"
  | "LAUNCHING"
  | "LAUNCHED"
  | "STARTING"
  | "STARTED"
  | "STOPPING"
  | "STOPPED"
  | "RESUMING"
  | "COMPLETING"
  | "COMPLETED"
  | "ERROR"
  | "OLD"
  | "PRUNING";

export type HistoricAvailableAction =
  | "EXPORT"
  | "LAUNCH"
  | "STOP"
  | "AUTHORIZE_AND_START"
  | "RESUME"
  | "DELETE";

export interface PreviewGraphPoint {
  id: number;
  name: string;
  y: number;
}

export interface Historic {
  id: number;
  name: string | null;
  searchId: string | null;
  category: HistoricCategory;
  status: HistoricStatus;
  availableActions: HistoricAvailableAction[];
  startDate: string;
  endDate: string;
  createdAt: string | null;
  updatedAt: string | null;
  authorizedAt: string | null;
  progress: number | null;
  previewResult: number | null;
  previewGraphData: PreviewGraphPoint[] | null;
  sampleSize: number | null;
}

export interface Search {
  id: number;
  name: string | null;
  type: SearchType;
  status: string | null;
  draftStatus: string;
  categories: Category[] | null;
  onlineNewsLicenses: OnlineNewsLicense[] | null;
  printNewsLicenses: PrintNewsLicense[] | null;
  broadcastLicenses: BroadcastLicense[] | null;
  booleanExpression: string | null;
  keywords: string[][] | null;
  url: string | null;
  urlKeywords: string[][] | null;
  realtimeStatus: SearchRealtimeStatus | null;
  historicStatus: SearchHistoricStatus | null;
  rtStartedAt: string | null;
  rtStoppedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  totalContents: number | null;
  historics: Historic[] | null;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface SearchConnection {
  nodes: Search[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface SearchesFilter {
  name?: string;
  status?: string[];
  type?: SearchType[];
  realtimeStatus?: SearchRealtimeStatus[];
  categories?: Category[];
  onlineNewsLicenses?: OnlineNewsLicense[];
  printNewsLicenses?: PrintNewsLicense[];
  folderId?: string;
  first?: number;
  after?: string;
}

export interface Folder {
  id: number;
  name: string;
  searchIds: number[];
}

// The shape every bulk-edit surface (table row selection, folder selection)
// normalizes into before handing off to BulkActionsToolbar and its dialogs.
export interface SelectedSearch {
  id: string;
  name: string;
  categories: Category[];
  onlineNewsLicenses: OnlineNewsLicense[];
  printNewsLicenses: PrintNewsLicense[];
}

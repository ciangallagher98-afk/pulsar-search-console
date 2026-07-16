import type { Category } from "./types";

export const CATEGORY_GROUPS: { label: string; categories: Category[] }[] = [
  {
    label: "Social",
    categories: [
      "FACEBOOK",
      "INSTAGRAM",
      "INSTAGRAM_PUBLIC",
      "X",
      "LINKEDIN",
      "TIKTOK",
      "THREADS",
      "PINTEREST",
      "REDDIT",
      "YOUTUBE",
      "TWITCH",
      "DISCORD",
      "TUMBLR",
      "SEA_FACEBOOK_PAGES",
      "VK",
    ],
  },
  {
    label: "News & broadcast",
    categories: ["ONLINE_NEWS", "PRINT_NEWS", "TV", "RADIO", "PODCAST"],
  },
  {
    label: "Forums & reviews",
    categories: ["FORUMS", "BLOGS", "REVIEWS", "TRIPADVISOR", "TRUSTPILOT", "SERMO", "DARK_WEB"],
  },
  {
    label: "Chinese platforms",
    categories: [
      "BAIDU",
      "CH_BAIDU",
      "CHINESE_ONLINE_NEWS",
      "BILIBILI",
      "DOUYIN",
      "KUAISHOU",
      "LITTLE_RED_BOOK",
      "TAOBAO",
      "WECHAT",
      "WEIBO",
      "ZHIHU",
      "NAVER",
    ],
  },
  {
    label: "Commerce & other",
    categories: ["ALIEXPRESS", "AMAZON", "EXPEDIA", "FIRST_PARTY_DATA", "SEARCH"],
  },
];

export function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { updateDataSources, updateLicenses } from "@/lib/actions/search-actions";
import {
  ONLINE_NEWS_LICENSE_VALUES,
  PRINT_NEWS_LICENSE_VALUES,
  type Category,
  type OnlineNewsLicense,
  type PrintNewsLicense,
} from "@/lib/pulsar/types";

const GROUPS: { label: string; categories: Category[] }[] = [
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

export function DataSourceGrid({
  searchId,
  initialCategories,
  initialOnlineNewsLicenses,
  initialPrintNewsLicenses,
  broadcastLicenses,
}: {
  searchId: string;
  initialCategories: Category[];
  initialOnlineNewsLicenses: OnlineNewsLicense[];
  initialPrintNewsLicenses: PrintNewsLicense[];
  broadcastLicenses: string[];
}) {
  const [categories, setCategories] = useState<Set<Category>>(new Set(initialCategories));
  const [onlineNewsLicenses, setOnlineNewsLicenses] = useState<Set<OnlineNewsLicense>>(
    new Set(initialOnlineNewsLicenses),
  );
  const [printNewsLicenses, setPrintNewsLicenses] = useState<Set<PrintNewsLicense>>(
    new Set(initialPrintNewsLicenses),
  );
  const [isPending, startTransition] = useTransition();

  const dirty =
    !setsEqual(categories, new Set(initialCategories)) ||
    !setsEqual(onlineNewsLicenses, new Set(initialOnlineNewsLicenses)) ||
    !setsEqual(printNewsLicenses, new Set(initialPrintNewsLicenses));

  function toggleCategory(category: Category, checked: boolean) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (checked) next.add(category);
      else next.delete(category);
      return next;
    });
  }

  function toggleLicense<T extends string>(
    setter: React.Dispatch<React.SetStateAction<Set<T>>>,
    value: T,
    checked: boolean,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const catResult = await updateDataSources(searchId, Array.from(categories));
      if (!catResult.ok) {
        toast.error(catResult.error ?? "Failed to update data sources");
        return;
      }
      const licenseResult = await updateLicenses(
        searchId,
        Array.from(onlineNewsLicenses),
        Array.from(printNewsLicenses),
      );
      if (!licenseResult.ok) {
        toast.error(licenseResult.error ?? "Failed to update licenses");
        return;
      }
      toast.success("Data sources updated");
    });
  }

  const showOnlineNewsLicenses = categories.has("ONLINE_NEWS");
  const showPrintNewsLicenses = categories.has("PRINT_NEWS");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
            <div className="grid gap-2">
              {group.categories.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={categories.has(category)}
                    onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                  />
                  <Label htmlFor={`cat-${category}`} className="font-normal">
                    {formatLabel(category)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(showOnlineNewsLicenses || showPrintNewsLicenses) && (
        <>
          <Separator />
          <div className="grid gap-6 sm:grid-cols-2">
            {showOnlineNewsLicenses && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Online news licenses
                </h3>
                <div className="grid gap-2">
                  {ONLINE_NEWS_LICENSE_VALUES.map((license) => (
                    <div key={license} className="flex items-center gap-2">
                      <Checkbox
                        id={`onl-${license}`}
                        checked={onlineNewsLicenses.has(license)}
                        onCheckedChange={(checked) =>
                          toggleLicense(setOnlineNewsLicenses, license, checked === true)
                        }
                      />
                      <Label htmlFor={`onl-${license}`} className="font-normal">
                        {formatLabel(license)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showPrintNewsLicenses && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Print news licenses
                </h3>
                <div className="grid gap-2">
                  {PRINT_NEWS_LICENSE_VALUES.map((license) => (
                    <div key={license} className="flex items-center gap-2">
                      <Checkbox
                        id={`pnl-${license}`}
                        checked={printNewsLicenses.has(license)}
                        onCheckedChange={(checked) =>
                          toggleLicense(setPrintNewsLicenses, license, checked === true)
                        }
                      />
                      <Label htmlFor={`pnl-${license}`} className="font-normal">
                        {formatLabel(license)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {broadcastLicenses.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Broadcast licenses (read-only — not editable via this tool)
            </h3>
            <p className="text-sm text-muted-foreground">
              {broadcastLicenses.map(formatLabel).join(", ")}
            </p>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || isPending}>
          {isPending ? "Saving…" : "Save data sources"}
        </Button>
        {dirty && !isPending && (
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

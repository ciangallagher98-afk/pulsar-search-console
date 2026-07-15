import {
  UPDATE_BOOLEAN_CONTENTS_SEARCH,
  UPDATE_BOOLEAN_TOPICS_SEARCH,
  UPDATE_CONTENTS_SEARCH,
  UPDATE_PANELS_SEARCH,
  UPDATE_TOPICS_SEARCH,
} from "./mutations";
import type { Category, OnlineNewsLicense, PrintNewsLicense, Search } from "./types";

interface UpdatePlan {
  mutation: string;
  input: Record<string, unknown>;
}

// Search flavors each have their own full-replace mutation (type x boolean-vs-field-based).
// This resolves which one applies and builds the payload, carrying forward the search's
// existing required fields so a data-source-only edit doesn't clobber anything else.
export function buildUpdateSearchPlan(
  search: Search,
  changes: {
    categories?: Category[];
    onlineNewsLicenses?: OnlineNewsLicense[];
    printNewsLicenses?: PrintNewsLicense[];
  },
): UpdatePlan {
  const isBoolean = Boolean(search.booleanExpression);
  const categories = changes.categories ?? search.categories ?? [];
  const onlineNewsLicenses =
    changes.onlineNewsLicenses ?? search.onlineNewsLicenses ?? undefined;
  const printNewsLicenses =
    changes.printNewsLicenses ?? search.printNewsLicenses ?? undefined;

  const base = {
    id: String(search.id),
    name: search.name ?? "",
    categories,
  };

  if (search.type === "CONTENTS" && isBoolean) {
    return {
      mutation: UPDATE_BOOLEAN_CONTENTS_SEARCH,
      input: { ...base, booleanExpression: search.booleanExpression },
    };
  }

  if (search.type === "CONTENTS" && !isBoolean) {
    return {
      mutation: UPDATE_CONTENTS_SEARCH,
      input: {
        ...base,
        urls: search.urlKeywords ?? [],
        onlineNewsLicenses,
        printNewsLicenses,
      },
    };
  }

  if (search.type === "TOPICS" && isBoolean) {
    return {
      mutation: UPDATE_BOOLEAN_TOPICS_SEARCH,
      input: {
        ...base,
        booleanExpression: search.booleanExpression,
        onlineNewsLicenses,
        printNewsLicenses,
      },
    };
  }

  if (search.type === "TOPICS" && !isBoolean) {
    return {
      mutation: UPDATE_TOPICS_SEARCH,
      input: {
        ...base,
        keywords: search.keywords ?? [],
        onlineNewsLicenses,
        printNewsLicenses,
      },
    };
  }

  // PANELS has no boolean variant
  return {
    mutation: UPDATE_PANELS_SEARCH,
    input: {
      ...base,
      keywords: search.keywords ?? [],
      onlineNewsLicenses,
      printNewsLicenses,
    },
  };
}

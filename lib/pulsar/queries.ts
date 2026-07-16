const SEARCH_FIELDS = `
  id
  name
  type
  status
  draftStatus
  categories
  onlineNewsLicenses
  printNewsLicenses
  broadcastLicenses
  booleanExpression
  keywords
  url
  urlKeywords
  realtimeStatus
  historicStatus
  rtStartedAt
  rtStoppedAt
  startDate
  endDate
  teamId
  teamName
  createdAt
  updatedAt
  totalContents
`;

const HISTORIC_FIELDS = `
  id
  name
  searchId
  category
  status
  availableActions
  startDate
  endDate
  createdAt
  updatedAt
  authorizedAt
  progress
  previewResult
  previewGraphData {
    id
    name
    y
  }
  sampleSize
`;

export const SEARCHES_QUERY = `
  query Searches(
    $name: String
    $status: [SearchStatusEnum!]
    $type: [SearchTypeEnum!]
    $realtimeStatus: [SearchRealtimeStatusEnum!]
    $categories: [CategoryEnum!]
    $onlineNewsLicenses: [OnlineNewsLicenseEnum!]
    $printNewsLicenses: [PrintNewsLicenseEnum!]
    $folderId: ID
    $first: Int
    $after: String
  ) {
    searches(
      name: $name
      status: $status
      type: $type
      realtimeStatus: $realtimeStatus
      categories: $categories
      onlineNewsLicenses: $onlineNewsLicenses
      printNewsLicenses: $printNewsLicenses
      folderId: $folderId
      first: $first
      after: $after
      sortBy: UPDATED_AT
      orderDirection: DESC
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ${SEARCH_FIELDS}
      }
    }
  }
`;

export const FOLDERS_QUERY = `
  query Folders($first: Int, $after: String) {
    folders(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        searchIds
      }
    }
  }
`;

export const SEARCH_QUERY = `
  query SearchDetail($id: ID!) {
    search(id: $id) {
      search {
        ${SEARCH_FIELDS}
        historics {
          ${HISTORIC_FIELDS}
        }
      }
    }
  }
`;

export const HISTORICS_QUERY = `
  query Historics($searchId: ID!) {
    historics(searchId: $searchId, first: 50) {
      totalCount
      nodes {
        ${HISTORIC_FIELDS}
      }
    }
  }
`;

export const HISTORIC_QUERY = `
  query HistoricStatus($searchId: ID!) {
    historics(searchId: $searchId, first: 50) {
      nodes {
        ${HISTORIC_FIELDS}
      }
    }
  }
`;

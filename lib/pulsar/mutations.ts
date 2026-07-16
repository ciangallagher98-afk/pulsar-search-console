// Pulsar's `errors` field on every mutation payload is `[Error!]!`, an
// object type — not a list of strings — so every mutation below selects
// `errors { message }` rather than a bare `errors`.
export interface MutationError {
  message: string;
}

export function errorMessage(errors: MutationError[]): string {
  return errors.map((e) => e.message).join("; ");
}

export const UPDATE_CONTENTS_SEARCH = `
  mutation UpdateContentsSearch($input: UpdateContentsSearchInput!) {
    updateContentsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors { message }
    }
  }
`;

export const UPDATE_BOOLEAN_CONTENTS_SEARCH = `
  mutation UpdateBooleanContentsSearch($input: UpdateBooleanContentsSearchInput!) {
    updateBooleanContentsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors { message }
    }
  }
`;

export const UPDATE_TOPICS_SEARCH = `
  mutation UpdateTopicsSearch($input: UpdateTopicsSearchInput!) {
    updateTopicsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors { message }
    }
  }
`;

export const UPDATE_BOOLEAN_TOPICS_SEARCH = `
  mutation UpdateBooleanTopicsSearch($input: UpdateBooleanTopicsSearchInput!) {
    updateBooleanTopicsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors { message }
    }
  }
`;

export const UPDATE_PANELS_SEARCH = `
  mutation UpdatePanelsSearch($input: UpdatePanelsSearchInput!) {
    updatePanelsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors { message }
    }
  }
`;

export const START_SEARCH = `
  mutation StartSearch($input: StartSearchInput!) {
    startSearch(input: $input) {
      search { id realtimeStatus rtStartedAt }
      errors { message }
    }
  }
`;

export const STOP_SEARCH = `
  mutation StopSearch($input: StopSearchInput!) {
    stopSearch(input: $input) {
      search { id realtimeStatus rtStoppedAt }
      errors { message }
    }
  }
`;

export const CREATE_HISTORIC = `
  mutation CreateHistoric($input: CreateHistoricInput!) {
    createHistoric(input: $input) {
      historics { id status availableActions }
      errors { message }
    }
  }
`;

export const LAUNCH_HISTORIC = `
  mutation LaunchHistoric($input: LaunchHistoricInput!) {
    launchHistoric(input: $input) {
      historics { id status availableActions }
      errors { message }
    }
  }
`;

export const AUTHORIZE_AND_START_HISTORIC = `
  mutation AuthorizeAndStartHistoric($input: AuthorizeAndStartHistoricInput!) {
    authorizeAndStartHistoric(input: $input) {
      historics { id status availableActions }
      errors { message }
    }
  }
`;

export const RESUME_HISTORIC = `
  mutation ResumeHistoric($input: ResumeHistoricInput!) {
    resumeHistoric(input: $input) {
      historics { id status availableActions }
      errors { message }
    }
  }
`;

export const STOP_HISTORIC = `
  mutation StopHistoric($input: StopHistoricInput!) {
    stopHistoric(input: $input) {
      historics { id status availableActions }
      errors { message }
    }
  }
`;

export const DELETE_HISTORIC = `
  mutation DeleteHistoric($input: DeleteHistoricInput!) {
    deleteHistoric(input: $input) {
      result
      errors { message }
    }
  }
`;

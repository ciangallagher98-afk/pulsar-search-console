export const UPDATE_CONTENTS_SEARCH = `
  mutation UpdateContentsSearch($input: UpdateContentsSearchInput!) {
    updateContentsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors
    }
  }
`;

export const UPDATE_BOOLEAN_CONTENTS_SEARCH = `
  mutation UpdateBooleanContentsSearch($input: UpdateBooleanContentsSearchInput!) {
    updateBooleanContentsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors
    }
  }
`;

export const UPDATE_TOPICS_SEARCH = `
  mutation UpdateTopicsSearch($input: UpdateTopicsSearchInput!) {
    updateTopicsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors
    }
  }
`;

export const UPDATE_BOOLEAN_TOPICS_SEARCH = `
  mutation UpdateBooleanTopicsSearch($input: UpdateBooleanTopicsSearchInput!) {
    updateBooleanTopicsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors
    }
  }
`;

export const UPDATE_PANELS_SEARCH = `
  mutation UpdatePanelsSearch($input: UpdatePanelsSearchInput!) {
    updatePanelsSearch(input: $input) {
      search { id name categories onlineNewsLicenses printNewsLicenses }
      errors
    }
  }
`;

export const START_SEARCH = `
  mutation StartSearch($input: StartSearchInput!) {
    startSearch(input: $input) {
      search { id realtimeStatus rtStartedAt }
      errors
    }
  }
`;

export const STOP_SEARCH = `
  mutation StopSearch($input: StopSearchInput!) {
    stopSearch(input: $input) {
      search { id realtimeStatus rtStoppedAt }
      errors
    }
  }
`;

export const CREATE_HISTORIC = `
  mutation CreateHistoric($input: CreateHistoricInput!) {
    createHistoric(input: $input) {
      historics { id status availableActions }
      errors
    }
  }
`;

export const LAUNCH_HISTORIC = `
  mutation LaunchHistoric($input: LaunchHistoricInput!) {
    launchHistoric(input: $input) {
      historics { id status availableActions }
      errors
    }
  }
`;

export const AUTHORIZE_AND_START_HISTORIC = `
  mutation AuthorizeAndStartHistoric($input: AuthorizeAndStartHistoricInput!) {
    authorizeAndStartHistoric(input: $input) {
      historics { id status availableActions }
      errors
    }
  }
`;

export const RESUME_HISTORIC = `
  mutation ResumeHistoric($input: ResumeHistoricInput!) {
    resumeHistoric(input: $input) {
      historics { id status availableActions }
      errors
    }
  }
`;

export const STOP_HISTORIC = `
  mutation StopHistoric($input: StopHistoricInput!) {
    stopHistoric(input: $input) {
      historics { id status availableActions }
      errors
    }
  }
`;

export const DELETE_HISTORIC = `
  mutation DeleteHistoric($input: DeleteHistoricInput!) {
    deleteHistoric(input: $input) {
      result
      errors
    }
  }
`;

// No "server-only" import here — this constant is shared with proxy.ts,
// which runs on the Edge runtime and can't pull in Node-only modules.
export const SESSION_COOKIE_NAME = "pulsar_api_key";

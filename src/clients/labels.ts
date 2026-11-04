import { client } from "@client";

/** What this client calls an Environment. */
export const ENV = client.labels.environment;
export const ENVS = client.labels.environments;

/** The same words mid-sentence. */
export const env = ENV.toLowerCase();
export const envs = ENVS.toLowerCase();

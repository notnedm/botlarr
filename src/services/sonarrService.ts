import { Errors, Series } from "../types";

const defaultHeaders = (): Record<string, string> => ({
  accept: "application/json",
  "Content-Type": "application/json",
  "X-Api-Key": process.env.SONARR_API_KEY,
});

export async function addToSonarr(tmdbId: number): Promise<void> {
  const {
    SONARR_API_URL,
    SONARR_ROOT_PATH,
    SONARR_TAGS = "",
    SONARR_QUALITY_PROFILE_ID = 1,
    SONARR_LANGUAGE_PROFILE_ID = 1,
    SONARR_MONITOR = "all",
  } = process.env;

  const [seriesFromLookup]: Series[] = await fetch(
    `${SONARR_API_URL}/v3/series/lookup?term=tmdbId%3A${tmdbId}`,
    {
      headers: defaultHeaders(),
    }
  ).then(async (res) => {
    if (!res.ok)
      throw new Error(`${res.status} - ${JSON.stringify(await res.json())}`);
    return res.json();
  });
  if (!seriesFromLookup)
    throw new Error(`No series found matching TMDB Id: ${tmdbId}`);

  if (!!seriesFromLookup?.path) throw new Error(Errors.ALREADY_EXISTS);

  await fetch(`${SONARR_API_URL}/v3/series`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({
      ...seriesFromLookup,
      seasonFolder: true,
      tags: SONARR_TAGS?.split(",") ?? [],
      qualityProfileId: SONARR_QUALITY_PROFILE_ID,
      languageProfileId: SONARR_LANGUAGE_PROFILE_ID,
      rootFolderPath: SONARR_ROOT_PATH,
      path: `${SONARR_ROOT_PATH}/${seriesFromLookup?.folder}`,
      addOptions: {
        monitor: SONARR_MONITOR,
        searchForMissingEpisodes: true,
        searchForCutoffUnmetEpisodes: true,
      },
    }),
  }).then(async (res) => {
    if (!res.ok)
      throw new Error(`${res.status} - ${JSON.stringify(await res.json())}`);
    return res.json();
  });
}

import { Errors, Movie } from "../types";

const defaultHeaders = (): Record<string, string> => ({
  accept: "application/json",
  "Content-Type": "application/json",
  "X-Api-Key": process.env.RADARR_API_KEY,
});

export async function addToRadarr(tmdbId: number): Promise<void> {
  const { RADARR_API_URL, RADARR_ROOT_PATH } = process.env;

  const [movieFromLookup]: Movie[] = await fetch(
    `${RADARR_API_URL}/v3/movie/lookup?term=tmdbId%3A${tmdbId}`,
    {
      headers: defaultHeaders(),
    }
  ).then(async (res) => {
    if (!res.ok)
      throw new Error(`${res.status} - ${JSON.stringify(await res.json())}`);
    return res.json();
  });
  if (!movieFromLookup)
    throw new Error(`No movies found matching TMDB Id: ${tmdbId}`);

  if (!!movieFromLookup?.movieFile?.path)
    throw new Error(Errors.ALREADY_EXISTS);

  await fetch(`${RADARR_API_URL}/v3/movie`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({
      ...movieFromLookup,
      tags: [8], // botlarr
      qualityProfileId: 6, // 720/1080
      languageProfileId: 1, // en
      rootFolderPath: RADARR_ROOT_PATH,
      path: `${RADARR_ROOT_PATH}/${movieFromLookup?.folder}`,
      minimumAvailability: "announced",
      monitored: true,
      addOptions: {
        monitor: "movieOnly",
        searchForMovie: true,
      },
    }),
  }).then(async (res) => {
    if (!res.ok)
      throw new Error(`${res.status} - ${JSON.stringify(await res.json())}`);
    return res.json();
  });
}

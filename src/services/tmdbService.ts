import { MediaTypes } from "../types";

const defaultHeaders = (): Record<string, string> => ({
  accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
});

export async function determineMediaType(
  imdbId: string
): Promise<[MediaTypes, number]> {
  const { TMDB_API_URL } = process.env;
  const { movie_results: movieResults, tv_results: tvResults } = await fetch(
    `${TMDB_API_URL}/find/${imdbId}?external_source=imdb_id`,
    {
      headers: defaultHeaders(),
    }
  ).then(async (res) => {
    if (!res.ok)
      throw new Error(`${res.status} - ${JSON.stringify(await res.json())}`);
    return res.json();
  });

  if (movieResults?.length > 0) return [MediaTypes.Movie, movieResults[0].id];
  if (tvResults?.length > 0) return [MediaTypes.Series, tvResults[0].id];

  throw new Error(`No media found matching IMDB Id: ${imdbId}`);
}

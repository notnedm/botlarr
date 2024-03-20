import { MediaTypes } from "../types";

const defaultHttpContentHeaders = {
  accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
};

export async function determineMediaType(
  imdbId: string
): Promise<[MediaTypes, number]> {
  const { TMDB_API_URL } = process.env;
  const { movie_results: movieResults, tv_results: tvResults } = await fetch(
    `${TMDB_API_URL}/find/${imdbId}?external_source=imdb_id`,
    {
      headers: defaultHttpContentHeaders,
    }
  ).then((res) => {
    if (!res.ok) throw new Error(JSON.stringify(res.json()));
    return res.json();
  });

  if (movieResults?.length > 0) return [MediaTypes.Movie, movieResults[0].id];
  if (tvResults?.length > 0) return [MediaTypes.Series, tvResults[0].id];

  throw new Error(`No media found matching IMDB Id: ${imdbId}`);
}

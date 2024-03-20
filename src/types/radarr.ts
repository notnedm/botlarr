export interface Movie {
  id: number;
  imdbId: string;
  tmdbId: number;
  movieFile?: string;
}

export interface MovieFile {
  path?: string;
}

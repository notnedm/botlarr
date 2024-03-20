export interface Movie {
  id: number;
  imdbId: string;
  tmdbId: number;
  folder: string;
  movieFile?: MovieFile;
}

export interface MovieFile {
  path?: string;
}

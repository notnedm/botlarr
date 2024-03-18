require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const mediaTypes = {
  movie: 0,
  series: 1,
};

const defaultHttpContentHeaders = {
  accept: "application/json",
  "Content-Type": "application/json",
};

const errors = {
  ALREADY_EXISTS: "KNOWN_ERR_ALREADY_EXISTS",
};

console.log("Starting app...");
startDiscordListener();

// functions
async function startDiscordListener() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.login(process.env.DISCORD_CLIENT_TOKEN);

  client.on("messageCreate", async (msg) => {
    if (!msg.content.includes("https://www.imdb.com/title/tt")) return;
    try {
      const imdbId = /tt\d+/.exec(msg.content)[0];
      console.log(`IMDB-${imdbId}: Start search`);
      await msg.react("🔍");
      await addMedia(imdbId);
      await msg.reactions.removeAll();
      await msg.react("✅");
      console.log(`IMDB-${imdbId}: Successfully added`);
    } catch (err) {
      await handleError(msg, err);
    }
  });
}

async function addMedia(imdbId) {
  const [mediaType, tmdbId] = await determineMediaType(imdbId);

  switch (mediaType) {
    case mediaTypes.movie:
      console.log(`IMDB-${imdbId} determined to be movie, searching Radarr`);
      await addToRadarr(tmdbId);
    case mediaTypes.series:
      console.log(`IMDB-${imdbId} determined to be series, searching Sonarr`);
      await addToSonarr(tmdbId);
  }
}

async function determineMediaType(imdbId) {
  try {
    const { TMDB_API_URL, TMDB_READ_ACCESS_TOKEN } = process.env;
    const { movie_results: movieResults, tv_results: tvResults } = await fetch(
      `${TMDB_API_URL}/find/${imdbId}?external_source=imdb_id`,
      {
        headers: {
          ...defaultHttpContentHeaders,
          Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
        },
      }
    ).then((res) => {
      if (!res.ok) throw new Error(JSON.stringify(res.json()));
      return res.json();
    });

    if (movieResults?.length > 0) return [mediaTypes.movie, movieResults[0].id];
    if (tvResults?.length > 0) return [mediaTypes.series, tvResults[0].id];

    throw new Error(`No media found matching IMDB Id: ${imdbId}`);
  } catch (err) {
    throw err;
  }
}

async function addToSonarr(tmdbId) {
  const { SONARR_API_KEY, SONARR_API_URL, SONARR_ROOT_PATH } = process.env;
  const defaultSonarrHeaders = {
    ...defaultHttpContentHeaders,
    "X-Api-Key": SONARR_API_KEY,
  };

  const [seriesFromLookup] = await fetch(
    `${SONARR_API_URL}/v3/series/lookup?term=tmdbId%3A${tmdbId}`,
    {
      headers: defaultSonarrHeaders,
    }
  ).then((res) => {
    if (!res.ok)
      throw new Error(
        res.status === 404
          ? `No series found matching TMDB Id: ${tmdbId}`
          : JSON.stringify(res.json())
      );
    return res.json();
  });

  if (!!seriesFromLookup?.path) throw new Error(errors.ALREADY_EXISTS);

  await fetch(`${SONARR_API_URL}/v3/series`, {
    method: "POST",
    headers: defaultSonarrHeaders,
    body: JSON.stringify({
      ...seriesFromLookup,
      tags: [8], // botlarr
      seasonFolder: true,
      qualityProfileId: 6, // 720/1080
      languageProfileId: 1, // en
      rootFolderPath: SONARR_ROOT_PATH,
      path: `${SONARR_ROOT_PATH}/${seriesFromLookup.folder}`,
      addOptions: {
        monitor: "firstSeason",
        searchForMissingEpisodes: true,
        searchForCutoffUnmetEpisodes: true,
      },
    }),
  }).then((res) => {
    if (!res.ok) throw new Error(JSON.stringify(res.json()));
    return res.json();
  });
}

async function addToRadarr(tmdbId) {
  const { RADARR_API_KEY, RADARR_API_URL, RADARR_ROOT_PATH } = process.env;
  const defaultRadarrHeaders = {
    ...defaultHttpContentHeaders,
    "X-Api-Key": RADARR_API_KEY,
  };

  const [movieFromLookup] = await fetch(
    `${RADARR_API_URL}/v3/movie/lookup?term=tmdbId%3A${tmdbId}`,
    {
      headers: defaultRadarrHeaders,
    }
  ).then((res) => {
    if (!res.ok)
      throw new Error(
        res.status === 404
          ? `No movies found matching TMDB Id: ${tmdbId}`
          : res.body
      );
    return res.json();
  });
  if (!movieFromLookup)
    throw new Error(`No movies found matching TMDB Id: ${tmdbId}`);

  if (!!movieFromLookup?.movieFile?.path)
    throw new Error(errors.ALREADY_EXISTS);

  // TODO: Verify payload
  await fetch(`${RADARR_API_URL}/v3/movie`, {
    method: "POST",
    headers: defaultRadarrHeaders,
    body: JSON.stringify({
      ...movieFromLookup,
      tags: [8], // botlarr
      qualityProfileId: 6, // 720/1080
      languageProfileId: 1, // en
      rootFolderPath: RADARR_ROOT_PATH,
      path: `${RADARR_ROOT_PATH}/${movieFromLookup.folder}`,
      minimumAvailability: "announced",
      monitored: true,
      addOptions: {
        monitor: "movieOnly",
        searchForMovie: true,
      },
    }),
  }).then((res) => {
    if (!res.ok) throw new Error(JSON.stringify(res.json()));
    return res.json();
  });
}

async function handleError(msg, err) {
  await msg.reactions.removeAll();
  const [emojiToReact, errorMsg] = getErrorResponse(err);
  await msg.react(emojiToReact);
  if (!!errorMsg) msg.reply(errorMsg);
}

function getErrorResponse(err) {
  const errRef = Date.now();
  console.error(errRef, err);
  switch (err.message) {
    case errors.ALREADY_EXISTS:
      return ["✅", "This is already being monitored"];
    default:
      return ["⚠️", `Error reference: ${errRef}`];
  }
}

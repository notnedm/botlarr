import { Client, GatewayIntentBits, Message } from "discord.js";
import { Errors, MediaTypes } from "../types";
import { addToRadarr } from "./radarrService";
import { addToSonarr } from "./sonarrService";
import { determineMediaType } from "./tmdbService";

export async function startDiscordListener(): Promise<void> {
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

  client.on("messageCreate", async (msg: Message<boolean>): Promise<void> => {
    if (!/^(https:\/\/)*((m|www)\.)?imdb\.com\/title\/tt/.test(msg.content))
      return;
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

async function addMedia(imdbId: string): Promise<void> {
  const [mediaType, tmdbId] = await determineMediaType(imdbId);
  const { SONARR_API_URL, RADARR_API_URL } = process.env;

  console.debug(`IMDB-${imdbId}: Determined to be ${MediaTypes[mediaType]}`);
  switch (mediaType) {
    case MediaTypes.Movie:
      if (!RADARR_API_URL) throw new Error(Errors.SERVICE_NOT_CONFIGURED);
      await addToRadarr(tmdbId);
      break;
    case MediaTypes.Series:
      if (!SONARR_API_URL) throw new Error(Errors.SERVICE_NOT_CONFIGURED);
      await addToSonarr(tmdbId);
      break;
    default:
      console.error(`IMDB-${imdbId}`, "Unknown media type");
  }
}

async function handleError(msg: Message<boolean>, err: Error): Promise<void> {
  await msg.reactions.removeAll();
  const [emojiToReact, errorMsg] = getErrorResponse(err);
  await msg.react(emojiToReact);
  if (!!errorMsg) msg.reply(errorMsg);
}

function getErrorResponse(err: Error): [emoji: string, errorMsg: string] {
  const errRef = Date.now();
  console.error(errRef, err);
  switch (err.message) {
    case Errors.ALREADY_EXISTS:
      return ["✅", "This is already being monitored"];
    case Errors.SERVICE_NOT_CONFIGURED:
      return ["❌", "Required service is not configured to monitor this media"];
    default:
      return ["⚠️", `Error reference: ${errRef}`];
  }
}

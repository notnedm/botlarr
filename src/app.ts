import { startDiscordListener } from "./services";
import { config as initDotenv } from "dotenv";
initDotenv();

console.log("Starting app...");
startDiscordListener();

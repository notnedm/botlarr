# botlarr

Basic NodeJS Discord bot to help allow your users to add media to your Servarr applications using IMDB links.

## Requirements
- node v20 (if running locally)
- docker (if running via `docker-compose`)
- Servarr applications (Radarr or Sonarr)
- TMDB API read access token
- [Discord bot token](https://discord.com/developers/docs/quick-start/getting-started)
  - Requires **MESSAGE CONTENT INTENT** enabled

## Running the application
First, you will need to create a `.env` file using [`.env.example`](.env.example) as a template, entering your personal configuration options.

You can make a quick copy using
```shell
cp .env.example .env
```

- It is recommend you use `docker-compose up -d` to run this application
- You can run it using a local installation of NodeJS (v20.11) and using `yarn start`



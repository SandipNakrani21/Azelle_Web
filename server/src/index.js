// Local / long-running server. On Vercel, api/index.js serves the same app as a serverless function.
import { getApp } from "./app.js";
import { config } from "./config.js";

getApp()
  .then((app) => {
    app.listen(config.port, () => console.log(`Azelle API listening on http://localhost:${config.port}`));
  })
  .catch((err) => {
    console.error(`Failed to start the API: ${err.message}`);
    process.exit(1);
  });

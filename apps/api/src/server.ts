import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`LaunchGuard API listening on port ${env.API_PORT}`);
});

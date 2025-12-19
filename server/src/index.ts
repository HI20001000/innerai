import { buildApp } from './app.js';
import { config } from './config.js';

const app = buildApp();

app.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${config.host}:${config.port}`);
});

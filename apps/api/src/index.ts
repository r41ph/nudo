import { createApp } from './app.js';

const port = parseInt(process.env.API_PORT || '3001', 10);

createApp().listen(port, () => {
  console.log(`API server running on http://localhost:${port}`); // eslint-disable-line no-console
  console.log(`GraphiQL available at http://localhost:${port}/graphiql`); // eslint-disable-line no-console
});

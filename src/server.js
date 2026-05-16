import 'dotenv/config';
import server from './server/server-bersama.js';
 
const port = process.env.PORT;
const host = process.env.HOST;
 
server.listen(port, () => {
  console.log(`Server running at http://${host}:${port}`);
});
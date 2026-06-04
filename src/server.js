import server from './server/server-bersama.js';
import 'dotenv/config';
 
//const port = process.env.PORT;
//const host = process.env.HOST;
 
//server.listen(port, () => {
//  console.log(`Server running at http://${host}:${port}`);
//});

const port = process.env.PORT || 5000;

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server backend UMKM berhasil berjalan di port: ${port}`);
});
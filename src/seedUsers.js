// seedUsers.js
import 'dotenv/config';
import bcrypt from 'bcrypt';
import db from './config/db.js';

async function seedWarungUsers() {
    const saltRounds = 10;
    
    // Pastikan urutan properti di sini konsisten
    const warungs = [
        { username: 'warung01', pass: 'AdminWRG001', id_warung: 'WRG-001' },
        { username: 'warung02', pass: 'AdminWRG002', id_warung: 'WRG-002' },
        { username: 'warung03', pass: 'AdminWRG003', id_warung: 'WRG-003' },
        { username: 'warung04', pass: 'AdminWRG004', id_warung: 'WRG-004' },
        { username: 'warung05', pass: 'AdminWRG005', id_warung: 'WRG-005' },
    ];

    console.log("Memulai proses seeding user...");

    for (const w of warungs) {
        try {
            // Debugging: Pastikan w.pass ada isinya
            if (!w.pass) {
                throw new Error(`Password untuk ${w.username} tidak ditemukan!`);
            }

            const hashedPassword = await bcrypt.hash(w.pass, saltRounds);
            
            // Query INSERT tetap harus urut: username, password, id_warung
            const query = 'INSERT INTO users (username, password, id_warung) VALUES (?, ?, ?)';
            
            await db.promise().execute(query, [w.username, hashedPassword, w.id_warung]);
            
            console.log(`✅ Sukses: User ${w.username} untuk ${w.id_warung} telah dibuat.`);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.warn(`⚠️ Peringatan: User ${w.username} sudah ada. Dilewati.`);
            } else {
                console.error(`❌ Gagal untuk ${w.username}: ${err.message}`);
            }
        }
    }
    
    console.log("Proses selesai.");
    process.exit();
}

seedWarungUsers();
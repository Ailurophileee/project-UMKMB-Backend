import axios from 'axios'; 
import db from '../../../config/db.js'; 
import response from '../../../utils/response.js';

export const getAnomalyAlert = async (req, res, next) => {
  try {
    // 1. Ambil ID warung dari token JWT user yang login
    const idWarungSipemilik = req.user.id_warung; 

    // Query SQL untuk mengambil data pengeluaran beserta rolling mean 7 transaksi terakhir per kategori
    const queryStr = `
      SELECT
        id_transaksi,
        kategori,
        nominal,
        tanggal,
        HOUR(tanggal) as jam_encoded,
        WEEKDAY(tanggal) as hari_dalam_minggu,
        (
          SELECT COALESCE(AVG(t2.nominal), t1.nominal)
          FROM transaksi t2
          WHERE t2.id_warung = t1.id_warung 
            AND t2.kategori = t1.kategori 
            AND t2.jenis = 'Pengeluaran'
            AND t2.tanggal <= t1.tanggal
          ORDER BY t2.tanggal DESC
          LIMIT 7
        ) as rolling_mean_7d
      FROM transaksi t1
      WHERE t1.id_warung = ? AND t1.jenis = 'Pengeluaran'
      ORDER BY t1.tanggal
    `;

db.query(queryStr, [idWarungSipemilik], async (err, results) => {
      if (err) return next(err);

      if (!results || results.length === 0) {
        return response(res, 200, 'Belum ada data transaksi pengeluaran untuk dianalisis.', { anomali: [] });
      }
      
      // 1. Ambil data asli dari database
      const dataAwal = results.map(row => {
        const nominal = parseFloat(row.nominal) || 0;
        const rollingMean = parseFloat(row.rolling_mean_7d) || nominal; 
        const rasioVsBaseline = rollingMean > 0 ? parseFloat((nominal / rollingMean).toFixed(2)) : 1.0;

        return {
          hari_dalam_minggu: parseInt(row.hari_dalam_minggu),
          id_transaksi: String(row.id_transaksi),
          jam_encoded: parseInt(row.jam_encoded),
          kategori: row.kategori || 'Lain-lain',
          nominal: nominal,
          rasio_vs_baseline: rasioVsBaseline,
          rolling_mean_7d: parseFloat(rollingMean.toFixed(2))
        };
      });

      // 2. SINKRONISASI INDEKS: Balik urutan data (dari lampau ke terbaru) sebelum dikirim ke AI 
      // agar posisi indeks [0, 1, 2...] pas dengan prapemrosesan model Python tim DS
      const transaksiFormatted = [...dataAwal].reverse();

      try {
        const urlServerAI = 'https://umkm-bersama-production.up.railway.app/api/ai/anomaly';

        // 3. Tembak Server AI dengan data yang urutannya sudah disinkronkan
        const responseDariAI = await axios.post(urlServerAI, {
          transaksi: transaksiFormatted
        });

        const listIsAnomaly = responseDariAI.data.is_anomaly || [];

        // 4. Petakan hasil analisis menggunakan dataFormatted yang sinkron dengan indeks AI
        const hasilPemetaanAI = transaksiFormatted.map((dataAsli, index) => {
          const nilaiIsAnomaly = listIsAnomaly[index];
          
          // Deteksi mutlak: AI mengembalikan angka -1 atau string '-1' untuk ANOMALI
          const isAnomaly = nilaiIsAnomaly === -1 || String(nilaiIsAnomaly) === '-1';

          return {
            id_transaksi: dataAsli.id_transaksi,
            kategori: dataAsli.kategori,
            nominal: dataAsli.nominal,
            rolling_mean_7d: dataAsli.rolling_mean_7d,
            baseline_rata_rata: `${(dataAsli.rasio_vs_baseline * 100).toFixed(1)}%`,
            status_audit: isAnomaly ? 'ANOMALI' : 'NORMAL',
            hasil_analisis: isAnomaly 
              ? '⚠️ Terdeteksi pengeluaran melonjak tajam dari batas wajar harian!' 
              : 'Transaksi aman dan tercatat sesuai batas wajar.'
          };
        });

        // 5. Kembalikan urutan data ke posisi semula (terbaru di atas) agar tampilan tabel UI tetap rapi
        const transaksiTerklasifikasi = [...hasilPemetaanAI].reverse();

        // 6. Lempar objek bersih { anomali: [...] } ke Frontend
        return response(res, 200, 'Analisis anomali transaksi berhasil diproses oleh AI', {
          anomali: transaksiTerklasifikasi
        });
       
      } catch (errorAI) {
        console.error('Error dari AI Anomaly Service:', errorAI.message);
        return res.status(502).json({
          status: 'fail',
          message: 'Gagal mendapatkan analisis dari server AI.'
        });
      }
    });
  } catch (error) {
    next(error);
  }
};
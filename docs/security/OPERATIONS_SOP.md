# SOP operasi keselamatan Akmal Taufik Enterprise

Pemilik operasi: pentadbir Akmal Taufik Enterprise. Skop: laman utama, tempahan dan portal Supabase, Cloudflare, ATEGateway dan deployment berkaitan. Sasaran verifikasi: OWASP ASVS 5.0 Tahap 2. Gunakan fungsi Govern, Identify, Protect, Detect, Respond dan Recover daripada NIST CSF 2.0 untuk operasi.

## 1. Inventori pendedahan

Semak setiap bulan dan selepas perubahan domain. Eksport rekod zon DNS dan senarai hostname yang dikaitkan dengan Pages, Workers, Railway dan penyedia lain. Bandingkan dengan sumber sijil awam dan rekod DNS bagi hostname yang diketahui. Catat tujuan, pemilik, status proxy, origin, status pengesahan, tarikh semakan dan keputusan bagi setiap nama. Simpan inventori operasi di storan akses terhad. Rekod sijil lama boleh kekal selepas perkhidmatan ditutup.

Kekalkan laluan awam yang diperlukan pelanggan. Alihkan admin dan staging ke akses beridentiti dengan MFA. Semak kebergantungan web, e-mel dan pengesahan domain sebelum menutup rekod lama. Sahkan origin tidak boleh menerima trafik terus yang memintas kawalan edge selepas kaedah pengesahan origin dipasang. Gunakan noindex untuk halaman yang tak perlu diindeks dan pengesahan untuk kandungan terhad.

## 2. Pengesahan, data dan input

Wajibkan MFA pentadbir pada penyedia identiti dan sahkan bahawa sesi yang tidak memenuhi tahap pengesahan ditolak di pelayan. Semak akses pentadbir dan tamatkan sesi apabila akses ditarik balik. Tetapkan had percubaan log masuk dan amaran anomali di penyedia identiti. Hadkan log supaya tidak mengandungi kata laluan, token atau data pelanggan.

Semak RLS, grants, fungsi RPC dan tetapan bucket melalui projek Supabase production yang betul. Pastikan semakan slot hanya memulangkan ketersediaan, lampiran tempahan berada dalam bucket private dan pautan paparan tamat tempoh. Semak input di pelayan, gunakan parameter bagi query SQL dan semak had saiz serta jenis fail. Uji menggunakan akaun contoh berasingan untuk akses tanpa login, pelanggan A, pelanggan B dan pentadbir. Buang fallback jadual tempahan selepas RPC disahkan pada laluan sebenar.

Untuk laluan AI, asingkan akses pengguna, rahsia dan sebarang tool yang melakukan tindakan. Uji arahan yang dibenamkan dalam fail contoh dan output model di staging. Pelayan mesti mengesahkan kebenaran setiap tindakan secara bebas.

## 3. Release dan pemantauan

Sebelum release, semak perubahan dan dependency lockfile. Uji log masuk, daftar, semak slot, tempah dan muat naik dengan data contoh di staging. Sahkan halaman awam dan API pelanggan terus berfungsi. Rekod commit, perubahan konfigurasi, keputusan ujian dan kaedah rollback. Selepas release, semak deployment, smoke test laluan awam dan pantau kadar ralat serta penolakan akses. Jika fungsi pelanggan rosak, pulihkan versi stabil dan sahkan semula sebelum release berikutnya.

Semak dependency advisory setiap minggu dan selepas perubahan lockfile. Utamakan isu yang dieksploitasi atau boleh dicapai melalui aplikasi. Jalankan semakan akses selepas perubahan pada DNS, penyedia identiti, pangkalan data atau Storage.

## 4. Tindak balas insiden

Apabila ada petunjuk kebocoran, ATO atau akses luar biasa, catat masa MYT, sistem terlibat dan skop yang diketahui. Simpan log berkaitan secara akses terhad. Sekat laluan terjejas atau akaun berisiko, tamatkan sesi berkaitan dan putar kelayakan yang terdedah. Pulihkan daripada versi yang disahkan, periksa semula matriks akses dan rekod punca, kesan, keputusan pemulihan serta pemilik tindakan susulan.

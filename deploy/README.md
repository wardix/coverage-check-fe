# Deploy Frontend Statis di nginx

Panduan ini mengubah frontend Next.js (atau Vite) dari `next start` + PM2 menjadi file
HTML/JS/CSS statis yang di-serve langsung oleh nginx. Server tidak lagi
menjalankan Node.js, jadi tidak ada proses yang perlu di-restart, di-patch,
atau dipantau ketika ada isu kompatibilitas atau celah keamanan Node/Next.

Isi folder `deploy/` ini dirancang untuk disalin apa adanya ke project lain.
Script yang sama juga jalan untuk frontend Vite atau SPA lain yang build-nya
menghasilkan file statis; lihat [Project Vite / SPA](#project-vite--spa).

| File | Fungsi |
| --- | --- |
| `deploy-static.sh` | Build, upload, aktifkan release, simpan riwayat, rollback |
| `env.example` | Contoh config per environment (`deploy/<env>.env`) |
| `nginx.conf.example` | Contoh server block nginx untuk Next.js static export |
| `nginx.spa.conf.example` | Contoh server block nginx untuk SPA (Vite, dll) |

## Cara kerja

```
lokal                                 server (DEPLOY_PATH)
-----                                 --------------------
npm ci && npm run build  -->  out/    releases/20261112T031500Z-a8ece14/
                              rsync   releases/20261112T073000Z-b71c2d0/
                                      current -> releases/20261112T073000Z-b71c2d0
                                                 ^ root nginx
```

1. Build menghasilkan folder `out/` (karena `output: 'export'`).
2. `out/` di-upload ke folder release baru. Release yang sedang live tidak disentuh.
3. Setelah upload selesai, symlink `current` dipindah ke release baru. nginx
   langsung melayani versi baru tanpa reload.
4. Release lama dihapus, disisakan sebanyak `KEEP_RELEASES` untuk rollback.

Kalau upload gagal atau dibatalkan (Ctrl-C) di tengah jalan, release parsial
dihapus dan `current` tetap menunjuk ke versi lama.

Selama deploy atau rollback berjalan, script memegang lock
`DEPLOY_PATH/.deploy.lock`. Deploy kedua ke environment yang sama ditolak sampai
yang pertama selesai.

## Prasyarat

Mesin yang menjalankan script (laptop atau server build):

- Node.js sesuai `.nvmrc` project
- `rsync`, `ssh`, `bash`
- SSH key yang sudah terdaftar di server tujuan

Server nginx:

- nginx dan `rsync` terpasang
- User deploy punya hak tulis di `DEPLOY_PATH`

## Menerapkan ke project lain

### 1. Cek kompatibilitas

Project Vite atau SPA lain langsung ke langkah 3; lihat juga
[Project Vite / SPA](#project-vite--spa).

Static export hanya bisa untuk halaman yang bisa dirender saat build. Fitur
berikut **tidak jalan** di static export dan harus dipindah ke backend/API atau
dihapus dulu:

| Fitur | Router | Alternatif |
| --- | --- | --- |
| API Routes (`pages/api/*`) / Route Handlers dinamis (`app/**/route.ts`) | keduanya | Pindah ke backend API |
| `getServerSideProps` | pages | Fetch di client (`useEffect`, SWR, React Query) |
| `revalidate` / ISR, `getStaticProps` dengan `revalidate` | keduanya | Build ulang saat data berubah, atau fetch di client |
| `cookies()`, `headers()`, Server Actions | app | Fetch di client ke backend |
| `middleware.ts` | keduanya | Cek auth di client, atau aturan di nginx |
| `rewrites`, `redirects`, `headers` di `next.config` | keduanya | Pindahkan ke nginx |
| Route dinamis (`[id]`) tanpa daftar path saat build | keduanya | `generateStaticParams` / `getStaticPaths`, atau pakai query string (`/detail?id=1`) |
| i18n routing bawaan (`i18n` di `next.config`) | pages | Prefix folder per bahasa |

Cara tercepat untuk cek: tambahkan `output: 'export'` (langkah 2), lalu jalankan
`npm run build`. Next.js menolak build dan menyebut file mana yang bermasalah.

Catatan:

- Variabel `NEXT_PUBLIC_*` dibakukan saat build. Satu hasil build hanya untuk
  satu environment; dev dan prod harus build terpisah.
- Variabel env tanpa prefix `NEXT_PUBLIC_` tidak tersedia di browser.
- Kalau deploy dari laptop, `.env.local` di laptop ikut terbaca saat build.
  Key yang sama di `deploy/<env>.env` menimpa nilai dari `.env.local`; key lain
  tetap terbaca dari `.env.local`. Jadi taruh **semua** `NEXT_PUBLIC_*` untuk
  environment tujuan di `deploy/<env>.env`.
- Project yang logikanya ada di API route (database, auth, upload file) tidak
  bisa dijadikan static export begitu saja; lihat
  [Project dengan backend di Next.js](#project-dengan-backend-di-nextjs).

### 2. Ubah `next.config`

```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // ...config lain
};
```

`images.unoptimized` wajib kalau project memakai `next/image`, karena optimasi
gambar butuh server Next.js.

Kalau app di-serve di sub-path (`https://host/diagram/`, bukan di root domain),
tambahkan juga `basePath: '/diagram'` dan lihat [App di sub-path](#app-di-sub-path).

Kalau project mengatur `distDir`, hasil export ikut ke folder itu; set `OUT_DIR`
di config deploy sesuai nilainya.

### 3. Salin file dan daftarkan

```bash
cp -r /path/ke/project-ini/deploy ./deploy
rm -f deploy/*.env   # jangan ikut menyalin config project lain
```

Tambahkan ke `.gitignore`:

```gitignore
/out/
/deploy/*.env
```

Tambahkan ke `package.json`, dan hapus script `start` karena `next start` tidak
berlaku untuk static export:

```json
"scripts": {
  "deploy": "bash deploy/deploy-static.sh"
}
```

### 4. Buat config environment

```bash
cp deploy/env.example deploy/prod.env
cp deploy/env.example deploy/dev.env
```

Isi minimal `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_PATH`, dan
`DEPLOY_BRANCH`. Satu folder `DEPLOY_PATH` untuk satu app dan satu environment,
misalnya `/var/www/diagram-struktur-organisasi` dan
`/var/www/dev-diagram-struktur-organisasi`.

### 5. Siapkan server (sekali per app)

```bash
sudo mkdir -p /var/www/diagram-struktur-organisasi
sudo chown <user-deploy>: /var/www/diagram-struktur-organisasi
```

Pastikan user nginx (`www-data` atau `nginx`) bisa membaca folder itu dan
semua folder induknya.

### 6. Deploy pertama, lalu pasang nginx

Deploy dulu supaya `current` sudah ada sebelum nginx diarahkan ke sana:

```bash
npm run deploy -- prod
```

Lalu salin `deploy/nginx.conf.example` ke server, sesuaikan `server_name`,
`root`, dan SSL:

```bash
sudo cp app.conf /etc/nginx/sites-available/diagram-struktur-organisasi.conf
sudo ln -s ../sites-available/diagram-struktur-organisasi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Kalau server memakai `conf.d/`, cukup salin ke `/etc/nginx/conf.d/<app>.conf`.

## Migrasi dari `next start` + PM2

Untuk app yang sudah live dengan `proxy_pass` ke `next start`:

1. Jalankan langkah 1–5 dan deploy pertama (langkah 6) ke `DEPLOY_PATH` baru.
   App lama tetap jalan.
2. Di server block nginx yang sudah ada, ganti blok `location / { proxy_pass ... }`
   dengan isi `nginx.conf.example` (`root`, `location`, `error_page`, `gzip`).
   Pertahankan `server_name` dan konfigurasi SSL yang sudah ada.
3. `sudo nginx -t && sudo systemctl reload nginx`, lalu cek app di browser.
4. Kalau sudah aman, matikan proses lama:
   `pm2 delete <nama-app> && pm2 save`.
5. Tutup port Node lama di firewall kalau sebelumnya dibuka.

Untuk balik ke versi lama: kembalikan blok `proxy_pass`, reload nginx, lalu
`pm2 start` lagi.

Kalau `DEPLOY_PATH` lama sudah berisi file langsung (bukan pola
`releases/` + `current`), script menolak jalan dengan pesan
`current sudah ada tapi bukan symlink`. Pindahkan isi lama ke folder lain dulu.

## Project Vite / SPA

Build Vite sudah menghasilkan file statis di `dist/`, jadi tidak ada config
framework yang perlu diubah.

1. Di `deploy/<env>.env`, set `OUT_DIR=dist`.
2. Taruh nilai `VITE_*` untuk environment tujuan di `deploy/<env>.env`
   (dibakukan saat build, sama seperti `NEXT_PUBLIC_*`).
3. Pakai `nginx.spa.conf.example`, bukan `nginx.conf.example`. Bedanya: semua
   path yang tidak ada filenya dijawab dengan `index.html`, karena routing
   ditangani di browser, dan aset ber-hash ada di `/assets/`.
4. Hapus script yang menjalankan server statis lewat PM2 (misalnya
   `pm2 serve dist ...`) dari `package.json`, lalu matikan prosesnya di server
   setelah nginx diarahkan ke folder baru.

## App di sub-path

Kalau app di-serve di bawah path domain lain (`https://host/ticket`), app harus
tahu prefix-nya saat build: `basePath: '/ticket'` di Next.js, atau
`base: '/ticket'` di Vite. Di nginx, tambahkan blok berikut ke server block
domain itu (bukan server block baru), dengan `alias` ke `current`:

```nginx
# /ticket tanpa garis miring: layani index.html (query string ikut).
location = /ticket {
    rewrite ^ /ticket/index.html last;
}

location ^~ /ticket/assets/ {
    alias /var/www/nama-app/current/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}

location ^~ /ticket/ {
    # ^~ melewati regex location level server, jadi tolak file tersembunyi di sini.
    location ~ /\. {
        deny all;
    }
    alias /var/www/nama-app/current/;
    # SPA: fallback ke index.html. Next.js static export:
    # try_files $uri $uri.html $uri/ =404;
    try_files $uri $uri/ /ticket/index.html;
    add_header Cache-Control "no-cache";
}
```

Untuk Next.js, ganti `/ticket/assets/` dengan `/ticket/_next/static/`.

`add_header` di dalam `location` membuat `add_header` dari level server (HSTS,
`X-Frame-Options`, dll) tidak diwarisi. Kalau server block domain itu punya
`add_header`, ulangi di setiap blok di atas.

## Project dengan backend di Next.js

Static export hanya menghasilkan file untuk browser. API route, NextAuth,
koneksi database, dan upload file butuh server yang terus jalan, jadi project
seperti ini tidak bisa langsung dipindah ke nginx. Pilihannya:

1. **Pisahkan backend.** Pindahkan isi `app/api/*` ke service backend
   (yang sudah ada atau baru), ganti pemanggilan di frontend ke URL backend,
   lalu frontend-nya baru di-deploy statis dengan script ini.
2. **Tetap pakai `next start`.** Upgrade Next.js secara rutin untuk menutup
   celah keamanan. Script ini tidak dipakai.

## Pemakaian sehari-hari

```bash
npm run deploy -- prod                 # build + deploy ke prod
npm run deploy -- dev                  # build + deploy ke dev
npm run deploy -- prod --list          # lihat release, tanda * = live
npm run deploy -- prod --rollback      # kembali ke release sebelumnya
npm run deploy -- prod --skip-install  # lewati npm ci (lebih cepat)
npm run deploy -- prod --skip-build    # upload out/ yang sudah ada
npm run deploy -- prod -y              # tanpa konfirmasi (CI)
```

Pengaman bawaan:

- Deploy ditolak kalau branch aktif bukan `DEPLOY_BRANCH`.
- Deploy ditolak kalau ada perubahan yang belum di-commit.
- `--force` melewati kedua cek di atas. Kalau ada perubahan yang belum
  di-commit, nama release diberi akhiran `-dirty`.
- Nama release berisi waktu (UTC) dan commit, jadi selalu jelas versi mana yang
  live.

Rollback hanya memindah symlink, tanpa build, jadi selesai dalam hitungan detik.
Release yang ditinggalkan langsung dihapus, supaya rollback berikutnya tidak
pernah memilih release rusak itu lagi. Menjalankan `--rollback` lagi mundur satu
release lagi.

## Build langsung di server

Kalau tidak bisa SSH dari laptop ke server nginx, clone repo di server nginx
lalu jalankan script di sana. Di config env itu:

```bash
DEPLOY_HOST=          # kosong = deploy ke folder lokal
DEPLOY_PATH=/var/www/diagram-struktur-organisasi
GIT_PULL=1            # git pull --ff-only sebelum build
```

Server tetap butuh Node.js untuk build, tapi tidak ada proses Node yang jalan
terus.

## Troubleshooting

| Gejala | Penyebab dan solusi |
| --- | --- |
| `out/index.html tidak ada` | `output: 'export'` belum ada di `next.config` |
| Build gagal: `Page "/x/[id]" is missing "generateStaticParams()"` | Route dinamis butuh daftar path saat build; lihat tabel kompatibilitas |
| Halaman tampil, tapi JS/CSS 404 | App di sub-path tanpa `basePath`, atau `root` nginx salah |
| 404 saat refresh di URL route dinamis | Path itu tidak dibuat saat build. Pakai query string, atau fallback SPA di nginx: `try_files $uri $uri.html $uri/ /index.html;` |
| `Permission denied` saat upload | User deploy tidak punya hak tulis di `DEPLOY_PATH` |
| 403 dari nginx | User nginx tidak bisa membaca `DEPLOY_PATH` atau folder induknya |
| Perubahan tidak muncul | Cek `--list` bahwa release baru sudah `current`; HTML memakai `no-cache`, cukup refresh |
| `deploy/rollback lain sedang berjalan` | Ada deploy lain ke environment yang sama. Kalau yakin tidak ada (misal koneksi putus di tengah deploy), hapus folder lock sesuai perintah di pesan error |
| Nilai `NEXT_PUBLIC_*` salah | Nilai dibakukan saat build; perbaiki `.env.production` atau `deploy/<env>.env`, lalu deploy ulang |

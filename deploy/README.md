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
| `deploy-static.sh` | Build, salin hasil build, aktifkan release, simpan riwayat, rollback |
| `env.example` | Contoh config (opsional): `deploy/default.env` atau `deploy/<env>.env` |
| `nginx.conf.example` | Contoh server block nginx untuk Next.js static export |
| `nginx.spa.conf.example` | Contoh server block nginx untuk SPA (Vite, dll) |

## Cara kerja

Script dijalankan langsung di server nginx, dari folder repo yang di-clone di
server itu. Tanpa argumen dan tanpa file config pun bisa jalan:

```bash
cd /path/ke/repo
git pull
npm run deploy
```

```
repo di server                      DEPLOY_PATH (default /var/www/<nama-folder-repo>)
--------------                      -------------------------------------------------
npm ci && npm run build  -> out/    releases/20261112T031500Z-a8ece14/
                            rsync   releases/20261112T073000Z-b71c2d0/
                                    current -> releases/20261112T073000Z-b71c2d0
                                               ^ root nginx
```

1. Build menghasilkan folder `out/` (karena `output: 'export'`).
2. `out/` disalin ke folder release baru. Release yang sedang live tidak disentuh.
3. Setelah salin selesai, symlink `current` dipindah ke release baru. nginx
   langsung melayani versi baru tanpa reload.
4. Release lama dihapus, disisakan sebanyak `KEEP_RELEASES` untuk rollback.

Kalau salin gagal atau dibatalkan (Ctrl-C) di tengah jalan, release parsial
dihapus dan `current` tetap menunjuk ke versi lama.

Selama deploy atau rollback berjalan, script memegang lock
`DEPLOY_PATH/.deploy.lock`. Deploy kedua ke folder yang sama ditolak sampai
yang pertama selesai.

Node.js hanya dipakai saat build. Setelah deploy selesai tidak ada proses Node
yang jalan terus.

Kalau ingin build di laptop atau mesin lain lalu mengirim hasilnya ke server
lewat SSH, lihat [Deploy dari mesin lain lewat SSH](#deploy-dari-mesin-lain-lewat-ssh).

## Prasyarat

Di server nginx:

- Node.js sesuai `.nvmrc` project (untuk build), `git`, `rsync`, `bash`
- nginx
- User yang menjalankan script punya hak tulis di `DEPLOY_PATH`

## Config

File config **opsional**. Tanpa file, script memakai nilai default:

| Variabel | Default |
| --- | --- |
| `DEPLOY_PATH` | `/var/www/<nama-folder-repo>`. Kalau repo sendiri di-clone di path itu, jadi `/var/www/<nama-folder-repo>-static` |
| `DEPLOY_BRANCH` | kosong (boleh deploy dari branch apa saja) |
| `GIT_PULL` | `0` (tidak `git pull` otomatis) |
| `KEEP_RELEASES` | `5` |
| `OUT_DIR` | `dist` kalau ada `vite.config.*` tanpa `next.config.*`, selain itu `out` |
| `INSTALL_CMD` | dideteksi dari lockfile (`npm ci`, `yarn`, `pnpm`) |
| `BUILD_CMD` | `npm run build` |
| `NEXT_PUBLIC_*` / `VITE_*` | dibaca build dari `.env`, `.env.production`, `.env.local` di folder repo |

Nama folder repo jadi bagian path default, jadi dua clone dengan nama folder
berbeda (misalnya `diagram-8086` dan `diagram-8087`) otomatis di-deploy ke folder
yang berbeda.

Untuk mengubah default:

```bash
cp deploy/env.example deploy/default.env   # dipakai oleh: npm run deploy
```

Buka komentar baris yang perlu diubah saja; baris yang masih di-comment memakai
default.

Kalau satu clone dipakai untuk beberapa environment (misalnya dev dan prod),
buat satu file per environment dan sebut namanya saat deploy:

```bash
cp deploy/env.example deploy/prod.env      # dipakai oleh: npm run deploy -- prod
cp deploy/env.example deploy/dev.env       # dipakai oleh: npm run deploy -- dev
```

Satu `DEPLOY_PATH` untuk satu app dan satu environment, misalnya
`/var/www/diagram-struktur-organisasi` dan `/var/www/dev-diagram-struktur-organisasi`.
`NEXT_PUBLIC_*` yang berbeda per environment juga ditaruh di file itu.

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
- Build membaca `.env`, `.env.production`, dan `.env.local` di folder repo
  tempat script dijalankan. Key yang sama di file config deploy menimpa nilai
  dari file-file itu; key lain tetap terbaca. Kalau memakai beberapa
  environment dari satu clone, taruh **semua** `NEXT_PUBLIC_*` environment itu
  di `deploy/<env>.env`.
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
di file config deploy sesuai nilainya.

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

### 4. Deploy pertama di server

Clone repo di server (atau pakai clone yang sudah ada dari era PM2), lalu dari
folder repo:

```bash
npm run deploy
```

Sebelum konfirmasi, baris `tujuan` menampilkan `DEPLOY_PATH` yang dipakai:
`/var/www/<nama-folder-repo>`, atau `/var/www/<nama-folder-repo>-static` kalau
repo sendiri di-clone di `/var/www/<nama-folder-repo>`. Config tidak wajib;
lihat [Config](#config) kalau path atau nilai lain perlu diubah.

Kalau folder itu belum ada atau belum bisa ditulis, script berhenti dan
menampilkan perintah yang perlu dijalankan sekali untuk path yang tepat,
misalnya:

```
sudo mkdir -p "/var/www/diagram-struktur-organisasi" && sudo chown deploy: "/var/www/diagram-struktur-organisasi"
```

Jalankan perintah itu, lalu ulangi `npm run deploy`. Pastikan user nginx
(`www-data` atau `nginx`) bisa membaca folder itu dan semua folder induknya.

Script menolak `DEPLOY_PATH` yang sudah berisi file lain (misalnya clone repo
lama), supaya release tidak tercampur dengan isi folder itu.

Deploy pertama ini dilakukan sebelum nginx diarahkan ke folder baru, jadi
`current` sudah ada saat nginx di-reload.

### 5. Pasang nginx

Salin `deploy/nginx.conf.example`, sesuaikan `server_name`, `root` (sama dengan
`tujuan` saat deploy, ditambah `/current`), dan SSL:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/diagram-struktur-organisasi.conf
sudo nano /etc/nginx/sites-available/diagram-struktur-organisasi.conf
sudo ln -s ../sites-available/diagram-struktur-organisasi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Kalau server memakai `conf.d/`, cukup salin ke `/etc/nginx/conf.d/<app>.conf`.

## Migrasi dari `next start` + PM2

Untuk app yang sudah live dengan `proxy_pass` ke `next start`:

1. Jalankan langkah 1–4 di clone repo yang sudah ada di server. Deploy pertama
   menulis ke `DEPLOY_PATH` baru, jadi app lama tetap jalan.
2. Di server block nginx yang sudah ada, ganti blok `location / { proxy_pass ... }`
   dengan isi `nginx.conf.example` (`root`, `location`, `error_page`, `gzip`).
   Pertahankan `server_name` dan konfigurasi SSL yang sudah ada.
3. `sudo nginx -t && sudo systemctl reload nginx`, lalu cek app di browser.
4. Kalau sudah aman, matikan proses lama:
   `pm2 delete <nama-app> && pm2 save`.
5. Tutup port Node lama di firewall kalau sebelumnya dibuka.

Untuk balik ke versi lama: kembalikan blok `proxy_pass`, reload nginx, lalu
`pm2 start` lagi.

Kalau `DEPLOY_PATH` sudah berisi file lain (bukan pola `releases/` + `current`,
misalnya clone repo lama atau root nginx lama), script menolak jalan dengan
pesan `sudah berisi file lain`. Pakai folder baru, atau pindahkan isi lama ke
folder lain dulu.

## Project Vite / SPA

Build Vite sudah menghasilkan file statis di `dist/`, jadi tidak ada config
framework yang perlu diubah.

1. `OUT_DIR` otomatis `dist` kalau ada `vite.config.*`. Kalau `build.outDir`
   diubah, set `OUT_DIR` di file config.
2. Nilai `VITE_*` dibaca dari `.env*` di folder repo, atau dari file config
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

Dari folder repo di server:

```bash
git pull                          # ambil perubahan (atau GIT_PULL=1 di config)
npm run deploy                    # build + deploy
npm run deploy -- --list          # lihat release, tanda * = live
npm run deploy -- --rollback      # kembali ke release sebelumnya
npm run deploy -- --skip-install  # lewati npm ci (lebih cepat)
npm run deploy -- --skip-build    # pakai out/ yang sudah ada
npm run deploy -- -y              # tanpa konfirmasi
npm run deploy -- prod            # pakai deploy/prod.env, bukan default
npm run deploy -- prod --rollback # rollback environment prod
```

Pengaman bawaan:

- Deploy ditolak kalau `DEPLOY_BRANCH` diisi dan branch aktif berbeda.
- Deploy ditolak kalau ada perubahan yang belum di-commit.
- `--force` melewati kedua cek di atas. Kalau ada perubahan yang belum
  di-commit, nama release diberi akhiran `-dirty`.
- `DEPLOY_PATH` tidak boleh sama dengan atau berada di dalam folder repo, dan
  tidak boleh folder yang sudah berisi file lain.
- Nama release berisi waktu (UTC) dan commit, jadi selalu jelas versi mana yang
  live.

Rollback hanya memindah symlink, tanpa build, jadi selesai dalam hitungan detik.
Release yang ditinggalkan langsung dihapus, supaya rollback berikutnya tidak
pernah memilih release rusak itu lagi. Menjalankan `--rollback` lagi mundur satu
release lagi.

## Deploy dari mesin lain lewat SSH

Opsional. Kalau server nginx tidak boleh dipasangi Node.js, build bisa
dilakukan di laptop atau server build, lalu hasilnya dikirim lewat `rsync` +
SSH. Buat file config dengan `DEPLOY_HOST` terisi:

```bash
cp deploy/env.example deploy/prod.env
# isi DEPLOY_HOST, DEPLOY_USER, DEPLOY_PORT, DEPLOY_PATH, NEXT_PUBLIC_*
npm run deploy -- prod
```

Kebutuhan tambahan:

- Mesin build: Node.js, `rsync`, `ssh`, SSH key yang terdaftar di server
- Server nginx: `rsync`; tidak perlu Node.js
- `DEPLOY_PATH` wajib diisi di mode ini (tidak ada default)

`.env.local` di mesin build ikut terbaca saat build, jadi taruh semua
`NEXT_PUBLIC_*` untuk server tujuan di file config.

## Troubleshooting

| Gejala | Penyebab dan solusi |
| --- | --- |
| `out/index.html tidak ada` | `output: 'export'` belum ada di `next.config` |
| Build gagal: `Page "/x/[id]" is missing "generateStaticParams()"` | Route dinamis butuh daftar path saat build; lihat tabel kompatibilitas |
| Halaman tampil, tapi JS/CSS 404 | App di sub-path tanpa `basePath`, atau `root` nginx salah |
| 404 saat refresh di URL route dinamis | Path itu tidak dibuat saat build. Pakai query string, atau fallback SPA di nginx: `try_files $uri $uri.html $uri/ /index.html;` |
| `tidak bisa membuat .../releases` atau `tidak punya hak tulis` | User yang menjalankan script tidak punya hak tulis di `DEPLOY_PATH`; jalankan perintah `mkdir`/`chown` yang ditampilkan |
| `DEPLOY_PATH ... di dalam folder repo` atau `sudah berisi file lain` | Set `DEPLOY_PATH` ke folder baru di luar repo di `deploy/default.env` |
| 403 dari nginx | User nginx tidak bisa membaca `DEPLOY_PATH` atau folder induknya |
| Perubahan tidak muncul | Cek `--list` bahwa release baru sudah `current`; HTML memakai `no-cache`, cukup refresh |
| `deploy/rollback lain sedang berjalan` | Ada deploy lain ke folder yang sama. Kalau yakin tidak ada (misal koneksi putus di tengah deploy), hapus folder lock sesuai perintah di pesan error |
| Nilai `NEXT_PUBLIC_*` salah | Nilai dibakukan saat build; perbaiki `.env.production` di repo atau file config deploy, lalu deploy ulang |

# Catur Warisan by Jorasmin Isa

Pakej kod sumber versi 6 bagi permainan catur beridentiti Alam Melayu.

## Kandungan

- `index.html` — halaman utama dan antaramuka permainan.
- `style.css` — rekaan, susun atur responsif dan animasi sinematik.
- `game.js` — peraturan catur, mod dua pemain/lawan komputer dan pengurusan permainan.
- `duel3d.js` — arena pertarungan WebGL dengan model ukiran bertekstur.
- `assets/*.webp` — potret karakter untuk babak sinematik.
- `assets/pieces/*.webp` — ukiran bidak catur berlatar telus.

## Cara menjalankan di Windows / VS Code

1. Ekstrak semua fail ZIP ke dalam satu folder.
2. Buka folder itu dalam VS Code.
3. Jalankan pelayan setempat, contohnya sambungan **Live Server** di VS Code, dan buka `index.html` melalui pelayan tersebut.
4. Alternatif jika Python tersedia: buka terminal dalam folder dan jalankan `python -m http.server 8000`, kemudian buka `http://localhost:8000`.

Kekalkan struktur folder `assets` supaya imej dan animasi dipaparkan dengan betul.

Permainan ini berjalan di pelayar tanpa backend. Rekod permainan disimpan dalam storan tempatan pelayar. Arena WebGL memerlukan sokongan grafik 3D; jika tidak tersedia, animasi berperspektif CSS akan digunakan secara automatik. Sesetengah fon mungkin memerlukan internet.

Kredit: **Catur Warisan by Jorasmin Isa**.

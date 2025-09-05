# Among Us – English Club (Fixed 6.1)
- Player UI minimal: input nama + OK -> kata keluar
- Hard-lock: URL ?mode=player selalu tampil Player (Admin nav disembunyikan)
- Tanpa payload per ronde; opsional **Init Player Link** (sekali) untuk seed roster ke device pemain
- Admin:
  - set Room, Round (1–10), Impostors (1/2), Roster (min 2, max 20)
  - Share **Player Link**: `?mode=player&room=<ROOM>`
  - Share **Init Player Link** (sekali): `?mode=player&room=<ROOM>&bootstrap=...`
- Player:
  - Buka Player Link, isi nama, isi nomor round dari Admin, klik OK
  - Jika pertama kali di device itu: buka **Init Player Link** terlebih dulu agar roster tersimpan (tanpa payload per ronde)
Build: `vite build` → deploy folder `dist/`.

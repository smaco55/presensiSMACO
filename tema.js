// TEMA.JS - menerapkan warna dan identitas sekolah dari config.js (jangan diubah; ubah config.js saja)
(function () {
  const T = Object.assign({ nama: 'Nama Sekolah', slogan: 'Sistem Presensi Peserta Didik', logo: 'logo.png', warna: '#1e3a5f', aksen: '#b8913a' }, window.PRESENSI_TEMA || {});
  window.TEMA = T;
  const hex = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0); };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const s = document.createElement('style');
  s.id = 'tema-vars';
  s.textContent = ':root{--pr:' + T.warna + ';--pr-d:' + mix(T.warna, '#000000', .28) + ';--pr-s:' + mix(T.warna, '#ffffff', .92) + ';--ak:' + T.aksen + ';--on-pr:#ffffff}' +
    '@media(prefers-color-scheme:dark){:root{--pr:' + mix(T.warna, '#ffffff', .5) + ';--pr-d:' + mix(T.warna, '#ffffff', .3) + ';--pr-s:' + mix(T.warna, '#000000', .6) + ';--ak:' + mix(T.aksen, '#ffffff', .15) + ';--on-pr:#0b1220}}';
  document.head.appendChild(s);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', T.warna);
  document.title = document.title.replace(/Presensi Sekolah|Presensi Kedatangan/, x => x + ' - ' + T.nama);
  const ini = (String(T.nama).split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('')) || 'S';
  window.brandFb = (el, px) => { const e = document.createElement('span'); e.className = 'mono'; e.style.cssText = 'width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * .4) + 'px'; e.textContent = ini; el.replaceWith(e); };
  window.brandLogo = px => '<img class="logo" src="' + String(T.logo).replace(/"/g, '') + '" width="' + px + '" height="' + px + '" alt="" onerror="brandFb(this,' + px + ')">';

  // Dialog Ganti password (dipakai di semua halaman). api = fungsi pemanggil server, toast = fungsi pemberi kabar, peran = peran akun.
  window.gantiPassword = function (api, toast, peran) {
    let d = document.getElementById('dpw');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'dpw';
      d.innerHTML = '<b style="font-family:var(--serif,Georgia,serif);font-size:18px">Ganti password</b><div class="mu" id="dpI" style="margin:4px 0 10px"></div>' +
        '<label>Password lama</label><input id="dpL" type="password" autocomplete="current-password">' +
        '<label>Password baru</label><input id="dpB" type="password" autocomplete="new-password">' +
        '<label>Ulangi password baru</label><input id="dpU" type="password" autocomplete="new-password">' +
        '<div id="dpE" style="color:var(--er,#b91c1c);font-size:13px;min-height:18px;margin-bottom:6px"></div>' +
        '<button class="b" id="dpOk" type="button">Simpan</button> <button class="s" id="dpX" type="button">Batal</button>';
      document.body.appendChild(d);
      d.querySelector('#dpX').onclick = () => d.close();
    }
    const min = peran === 'Admin' ? 8 : 6, g = s => d.querySelector(s);
    g('#dpI').textContent = 'Minimal ' + min + ' karakter. Huruf besar dan kecil dibedakan.';
    ['#dpL', '#dpB', '#dpU'].forEach(s => g(s).value = ''); g('#dpE').textContent = '';
    g('#dpOk').onclick = async () => {
      const lama = g('#dpL').value, baru = g('#dpB').value, ulang = g('#dpU').value, E = g('#dpE');
      if (!lama) return E.textContent = 'Isi password lama.';
      if (baru.length < min) return E.textContent = 'Password baru minimal ' + min + ' karakter.';
      if (baru !== ulang) return E.textContent = 'Pengulangan password baru tidak sama.';
      g('#dpOk').disabled = true;
      try { await api('ganti_password', { lama: lama, baru: baru }); d.close(); toast('Password berhasil diganti'); }
      catch (e) { E.textContent = e.message; }
      g('#dpOk').disabled = false;
    };
    d.showModal(); g('#dpL').focus();
  };
})();

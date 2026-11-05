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
})();

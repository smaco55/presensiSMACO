if(guard('pencatat')){
const S={b:[],p:[],low:[],libur:[],edB:null,edP:null,q:{},av:null};
const D=()=>new Date().toLocaleDateString('sv-SE');
const act=()=>S.b.filter(x=>x.Status==='Aktif'&&x.Jenis!=='Pesan'); // barang tanpa stok tidak ikut daftar stok
const pName=id=>(S.p.find(x=>x.ID===id)||{}).Nama||'-';
const opts=(arr,f)=>arr.map(f).join('');
async function load(){
  const [b,p,l,d]=await Promise.all([api('barangAll'),api('pemasokAll'),api('lowStock'),api('init')]);
  S.b=b;S.p=p;S.low=l;S.libur=d.libur;applyTheme(d.cfg);$('#hdrName').textContent='Pencatatan · '+(d.cfg.nama_kantin||'');
  if(!S.av)S.av=new Set(S.b.filter(x=>x.DijualHariIni==='Ya').map(x=>x.ID));
  renderAll();loadOrders().catch(()=>{});}
load().catch(e=>toast(e.message,1));
$('#mt').value=D();$('#lt').value=D();

$('#tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b===e.target));
  ['hari','masuk','rekap','order','barang','pem','retur','stok'].forEach(x=>$('#t-'+x).classList.toggle('hide',x!==t));};
function renderAll(){renderStokSel();renderPoForm();renderHari();renderMasuk();renderBarang();renderPem();renderRetur();}

// ===== barang dijual hari ini + jadwal =====
function renderHari(){
  $('#low').innerHTML=S.low.length?`<div class="low"><b>Stok menipis / habis (${S.low.length})</b>${S.low.map(x=>`<div class="row"><span>${esc(x.nama)}</span><span>sisa ${x.stok} (min ${x.min})</span></div>`).join('')}</div>`:'';
  const q=$('#fh').value.toLowerCase();
  $('#hari').innerHTML=act().filter(x=>x.Nama.toLowerCase().includes(q)).map(x=>`<label class="ck"><input type="checkbox" data-id="${esc(x.ID)}" ${S.av.has(x.ID)?'checked':''}><span style="flex:1">${esc(x.Nama)}<br><small class="mu">stok ${x.Stok}</small></span></label>`).join('');
  $('#liburList').innerHTML=S.libur.map(l=>`<div class="row"><span>${esc(String(l.Tanggal).slice(0,10))} · ${esc(l.Keterangan)}</span><button class="btn sm red" data-ld="${esc(String(l.Tanggal).slice(0,10))}">Hapus</button></div>`).join('');}
$('#fh').oninput=renderHari;
$('#hari').onchange=e=>{const id=e.target.dataset.id;if(id)e.target.checked?S.av.add(id):S.av.delete(id);};
$('#bHari').onclick=e=>run(e.target,async()=>{await api('setAvailable',{ids:[...S.av]});toast(S.av.size+' barang dijual hari ini');});
$('#bLibur').onclick=e=>run(e.target,async()=>{await api('saveLibur',{tanggal:$('#lt').value,keterangan:$('#lk').value,tutup:$('#lp').value});$('#lk').value='';await load();toast('Jadwal ditambahkan');});
$('#liburList').onclick=e=>{const d=e.target.dataset.ld;if(d&&confirm('Hapus jadwal '+d+'?'))run(e.target,async()=>{await api('delLibur',{tanggal:d});await load();});};

// ===== barang masuk =====
function renderMasuk(){const cur=$('#mp').value;$('#mp').innerHTML=opts(S.p,x=>`<option value="${esc(x.ID)}">${esc(x.Nama)}</option>`);if(cur)$('#mp').value=cur;
  const q=$('#fm').value.toLowerCase();
  $('#masuk').innerHTML=act().filter(x=>x.IDPemasok===$('#mp').value&&x.Nama.toLowerCase().includes(q)).map(x=>`<div class="ck"><span style="flex:1">${esc(x.Nama)}<br><small class="mu">stok ${x.Stok} · titip ${rp(x.HargaTitip)}</small></span><input type="number" class="qty" inputmode="numeric" placeholder="0" data-id="${esc(x.ID)}" value="${S.q[x.ID]||''}"></div>`).join('')||'<p class="mu">Belum ada barang untuk pemasok ini</p>';}
$('#mp').onchange=()=>{S.q={};renderMasuk();};$('#fm').oninput=renderMasuk;
$('#masuk').oninput=e=>{const id=e.target.dataset.id;if(id)S.q[id]=e.target.value;};
$('#bMasuk').onclick=e=>run(e.target,async()=>{
  const items=Object.keys(S.q).filter(id=>Number(S.q[id])>0).map(id=>({id,qty:Number(S.q[id])}));if(!items.length)throw new Error('Isi jumlah minimal satu barang');
  const r=await api('stockIn',{idPemasok:$('#mp').value,tanggal:$('#mt').value,items});
  S.rt=`Tanda terima barang masuk\n${r.tanggal}\nPemasok: ${pName($('#mp').value)}\n`+r.items.map(i=>`- ${i.nama}: ${i.jumlah}`).join('\n');
  $('#rTxt').textContent=S.rt;$('#dR').showModal();S.q={};await load();});
$('#rShare').onclick=()=>{if(navigator.share)navigator.share({text:S.rt}).catch(()=>{});else navigator.clipboard.writeText(S.rt).then(()=>toast('Disalin'));};$('#rX').onclick=()=>$('#dR').close();

// ===== kelola barang =====
function renderBarang(){const q=$('#fb').value.toLowerCase();
  $('#barang').innerHTML=S.b.filter(x=>x.Nama.toLowerCase().includes(q)).map(x=>`<div class="card" style="margin-top:6px;${x.Status==='Aktif'?'':'opacity:.5'}" data-e="${esc(x.ID)}"><b>${esc(x.Nama)}</b> <span class="tag">${esc(x.Kategori||'-')}</span><div class="row" style="border:0"><span>${esc(pName(x.IDPemasok))}</span><span>${x.Jenis==='Pesan'?'<b>sesuai pesanan</b>'+(Number(x.Kuota)?' · kuota '+x.Kuota:''):'stok <b>'+x.Stok+'</b>'}</span></div><div class="mu">Titip ${rp(x.HargaTitip)} · Jual ${rp(x.HargaJual)}</div></div>`).join('');}
$('#fb').oninput=renderBarang;
const jn=()=>$('#bkqW').classList.toggle('hide',$('#bjn').value!=='Pesan');$('#bjn').onchange=jn;
function openB(x){S.edB=x||null;$('#dBt').textContent=x?'Ubah barang':'Barang baru';
  $('#bp').innerHTML=opts(S.p,p=>`<option value="${esc(p.ID)}">${esc(p.Nama)}</option>`);
  $('#bn').value=x?x.Nama:'';$('#bk').value=x?x.Kategori:'';$('#bp').value=x?x.IDPemasok:(S.p[0]||{}).ID;$('#bt').value=x?x.HargaTitip:'';$('#bj').value=x?x.HargaJual:'';
  $('#bs').value=x?x.Satuan:'pcs';$('#bm').value=x?x.StokMin:5;$('#bst').value=x?x.Status:'Aktif';$('#bjn').value=x&&x.Jenis==='Pesan'?'Pesan':'Stok';$('#bkq').value=x&&x.Kuota?x.Kuota:0;jn();warn();S.fotoData=null;$('#bf').value='';$('#bfp').classList.add('hide');
  if(x&&x.Foto)api('fotoGet',{tipe:'barang',id:x.ID}).then(r=>{if(r.data){$('#bfp').src=r.data;$('#bfp').classList.remove('hide');}}).catch(()=>{});$('#dB').showModal();}
$('#bf').onchange=async e=>{if(!e.target.files[0])return;try{S.fotoData=await compressImg(e.target.files[0],320,70*1024);$('#bfp').src=S.fotoData;$('#bfp').classList.remove('hide');}catch(err){toast(err.message,1);e.target.value='';S.fotoData=null;}};
const warn=()=>$('#bw').classList.toggle('hide',!(Number($('#bj').value)<Number($('#bt').value)));
$('#bj').oninput=warn;$('#bt').oninput=warn;
$('#bNewB').onclick=()=>{if(!S.p.length)return toast('Tambah pemasok dulu',1);openB();};
$('#barang').onclick=e=>{const c=e.target.closest('[data-e]');if(c)openB(S.b.find(x=>x.ID===c.dataset.e));};
$('#bX').onclick=()=>$('#dB').close();
$('#bSave').onclick=e=>run(e.target,async()=>{
  const r=await api('saveBarang',{id:S.edB&&S.edB.ID,nama:$('#bn').value.trim(),kategori:$('#bk').value,idPemasok:$('#bp').value,hargaTitip:$('#bt').value,hargaJual:$('#bj').value,satuan:$('#bs').value,stokMin:$('#bm').value,status:$('#bst').value,jenis:$('#bjn').value,kuota:$('#bkq').value});
  if(S.fotoData){await api('fotoSet',{tipe:'barang',id:r.id,data:S.fotoData});S.fotoData=null;}
  $('#dB').close();await load();toast(r.peringatan||'Tersimpan',!!r.peringatan);});

// ===== pemasok =====
function renderPem(){$('#pemList').innerHTML=S.p.map(x=>`<div class="card" style="margin-top:6px" data-p="${esc(x.ID)}"><b>${esc(x.Nama)}</b><div class="mu">${esc(x.WhatsApp||'-')} ${x.Alamat?'· '+esc(x.Alamat):''}</div>${x.Catatan?`<div class="mu">${esc(x.Catatan)}</div>`:''}</div>`).join('');}
function openP(x){S.edP=x||null;$('#pn').value=x?x.Nama:'';$('#pw').value=x?x.WhatsApp:'';$('#pa').value=x?x.Alamat:'';$('#pc').value=x?x.Catatan:'';$('#dP').showModal();}
$('#bNewP').onclick=()=>openP();$('#pemList').onclick=e=>{const c=e.target.closest('[data-p]');if(c)openP(S.p.find(x=>x.ID===c.dataset.p));};$('#pX').onclick=()=>$('#dP').close();
$('#pSave').onclick=e=>run(e.target,async()=>{await api('saveSupplier',{id:S.edP&&S.edP.ID,nama:$('#pn').value.trim(),wa:$('#pw').value.replace(/\D/g,''),alamat:$('#pa').value,catatan:$('#pc').value});$('#dP').close();await load();toast('Tersimpan');});

// ===== retur & opname =====
function renderRetur(){const o=opts(act(),x=>`<option value="${esc(x.ID)}">${esc(x.Nama)} (stok ${x.Stok})</option>`);$('#rb').innerHTML=o;$('#ob').innerHTML=o;opInfo();}
$('#rj').onchange=()=>$('#rpWrap').classList.toggle('hide',$('#rj').value!=='hilang');
const opInfo=()=>{const b=S.b.find(x=>x.ID===$('#ob').value);$('#oInfo').textContent=b?'Stok di sistem: '+b.Stok:'';};$('#ob').onchange=opInfo;
$('#bRetur').onclick=e=>run(e.target,async()=>{const j=$('#rj').value;
  await api('retur',{idBarang:$('#rb').value,jenis:j,penanggung:j==='hilang'?$('#rpt').value:'',jumlah:$('#rq').value,alasan:$('#ra').value.trim()});
  $('#rq').value='';$('#ra').value='';await load();toast('Tercatat');});
$('#bOpn').onclick=e=>run(e.target,async()=>{const b=S.b.find(x=>x.ID===$('#ob').value),fis=parseInt($('#oq').value,10);
  if(!b||isNaN(fis)||fis<0)throw new Error('Isi hasil hitung');const diff=Number(b.Stok)-fis;
  if(diff===0)return toast('Stok sudah sesuai');
  if(diff<0)throw new Error('Stok fisik lebih banyak '+(-diff)+'. Catat lewat Barang Masuk atau hubungi Kepala Kantin.');
  if(!$('#oa').value.trim())throw new Error('Alasan wajib diisi');
  if(!confirm('Catat selisih kurang '+diff+' '+b.Nama+' ditanggung '+$('#op').value+'?'))return;
  await api('retur',{idBarang:b.ID,jenis:'hilang',penanggung:$('#op').value,jumlah:diff,alasan:'Opname: '+$('#oa').value.trim()});
  $('#oq').value='';$('#oa').value='';await load();toast('Selisih stok dicatat');});

// ===== pesan ke pemasok =====
S.pq={};S.orders=[];S.editPo=null;
const waNum=n=>{n=String(n||'').replace(/\D/g,'');return n.startsWith('0')?'62'+n.slice(1):n;};
const poText=o=>`Pesanan barang\n${o.tanggal}\nKepada: ${o.pemasok}\n`+o.items.map(i=>`- ${i.nama}: ${i.jumlah}`).join('\n')+'\nMohon konfirmasi ketersediaan. Terima kasih.';
async function loadOrders(){S.orders=await api('orderList');renderOrders();}
function renderPoForm(){const cur=$('#poP').value;$('#poP').innerHTML=opts(S.p,x=>`<option value="${esc(x.ID)}">${esc(x.Nama)}</option>`);if(cur)$('#poP').value=cur;
  const q=$('#poF').value.toLowerCase();
  $('#poItems').innerHTML=act().filter(x=>x.IDPemasok===$('#poP').value&&x.Nama.toLowerCase().includes(q)).map(x=>`<div class="ck"><span style="flex:1">${esc(x.Nama)}<br><small class="mu">stok ${x.Stok} (min ${x.StokMin})</small></span><input type="number" class="qty" inputmode="numeric" placeholder="0" data-id="${esc(x.ID)}" value="${S.pq[x.ID]||''}"></div>`).join('')||'<p class="mu">Belum ada barang untuk pemasok ini</p>';}
$('#poP').onchange=()=>{S.pq={};renderPoForm();};$('#poF').oninput=renderPoForm;
$('#poItems').oninput=e=>{const id=e.target.dataset.id;if(id)S.pq[id]=e.target.value;};
$('#bPoSug').onclick=()=>{act().filter(x=>x.IDPemasok===$('#poP').value&&Number(x.Stok)<=Number(x.StokMin)).forEach(x=>S.pq[x.ID]=Math.max(Number(x.StokMin)*2-Number(x.Stok),1));renderPoForm();
  if(!Object.keys(S.pq).length)toast('Tidak ada stok menipis untuk pemasok ini');};
function poReset(){S.pq={};S.editPo=null;$('#poT').textContent='Pesanan baru ke pemasok';$('#bPoX').classList.add('hide');renderPoForm();}
$('#bPoX').onclick=poReset;
$('#bPoSave').onclick=e=>run(e.target,async()=>{
  const items=Object.keys(S.pq).filter(id=>Number(S.pq[id])>0).map(id=>({id,qty:Number(S.pq[id])}));if(!items.length)throw new Error('Isi jumlah minimal satu barang');
  await api('orderSave',{id:S.editPo,idPemasok:$('#poP').value,items});poReset();await loadOrders();toast('Draft tersimpan');});
function renderOrders(){
  $('#poList').innerHTML=S.orders.map(o=>`<div class="card" style="margin-bottom:8px"><div class="row" style="border:0"><b>${esc(o.pemasok||'-')}</b><span class="tag">${esc(o.status)}</span></div><div class="mu">${esc(o.tanggal)}</div>
   ${o.items.map(i=>`<div class="row"><span>${esc(i.nama)}</span><span>${o.status==='Draft'?i.jumlah:i.diterima+' / '+i.jumlah}</span></div>`).join('')}
   ${o.status==='Draft'?`<button class="btn sm" data-wa="${esc(o.id)}">Kirim via WhatsApp</button> <button class="btn sm alt" data-cp="${esc(o.id)}">Salin</button> <button class="btn sm alt" data-ed="${esc(o.id)}">Ubah</button> <button class="btn sm red" data-dl="${esc(o.id)}">Hapus</button>`:''}
   ${o.status==='Dipesan'||o.status==='Diterima sebagian'?`<button class="btn sm" data-rc="${esc(o.id)}">Terima barang</button> <button class="btn sm alt" data-wa2="${esc(o.id)}">Kirim ulang WA</button>`:''}</div>`).join('')||'<p class="mu">Belum ada pesanan</p>';}
const ord=id=>S.orders.find(o=>o.id===id);
const openWa=o=>window.open('https://wa.me/'+waNum(o.wa)+'?text='+encodeURIComponent(poText(o)),'_blank');
$('#poList').onclick=e=>{const d=e.target.dataset;
  if(d.wa){const o=ord(d.wa);if(!waNum(o.wa))return toast('Nomor WhatsApp pemasok belum diisi',1);openWa(o);
    if(confirm('Pesan sudah terkirim? Tandai pesanan sebagai Dipesan.'))run(e.target,async()=>{await api('orderStatus',{id:o.id});await loadOrders();});}
  if(d.wa2){const o=ord(d.wa2);if(!waNum(o.wa))return toast('Nomor WhatsApp pemasok belum diisi',1);openWa(o);}
  if(d.cp){const o=ord(d.cp);navigator.clipboard.writeText(poText(o)).then(()=>toast('Teks pesanan disalin'));}
  if(d.ed){const o=ord(d.ed);S.editPo=o.id;S.pq={};o.items.forEach(i=>S.pq[i.id]=i.jumlah);$('#poP').value=o.idPemasok;$('#poT').textContent='Ubah Draft';$('#bPoX').classList.remove('hide');renderPoForm();window.scrollTo(0,0);}
  if(d.dl&&confirm('Hapus draft ini?'))run(e.target,async()=>{await api('orderDelete',{id:d.dl});await loadOrders();});
  if(d.rc){const o=ord(d.rc);S.rec=o;$('#recL').innerHTML=o.items.map(i=>`<div class="ck"><span style="flex:1">${esc(i.nama)}<br><small class="mu">dipesan ${i.jumlah}, sudah diterima ${i.diterima}</small></span><input type="number" class="qty" inputmode="numeric" data-id="${esc(i.id)}" value="${Math.max(i.jumlah-i.diterima,0)}"></div>`).join('');$('#dRec').showModal();}};
$('#recX').onclick=()=>$('#dRec').close();
$('#recOk').onclick=e=>run(e.target,async()=>{const items=[...document.querySelectorAll('#recL input')].map(i=>({id:i.dataset.id,qty:Number(i.value)})).filter(i=>i.qty>0);
  const r=await api('orderReceive',{id:S.rec.id,items});$('#dRec').close();toast('Barang masuk dicatat · '+r.status);await load();});

// ===== kartu stok & mutasi barang =====
$('#skD').value=D().slice(0,8)+'01';$('#skS').value=D();
const agoD=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('sv-SE');};
$('#skChips').onclick=e=>{const p=e.target.dataset.p;if(!p)return;$('#skS').value=D();$('#skD').value=p==='h'?D():p==='m'?agoD(6):D().slice(0,8)+'01';};
function renderStokSel(){const cur=$('#skB').value;$('#skB').innerHTML='<option value="">Semua barang (rekap mutasi)</option>'+opts(act(),x=>`<option value="${esc(x.ID)}">${esc(x.Nama)}</option>`);if(cur)$('#skB').value=cur;}
const tw2=w=>String(w).replace(/ 00:00:00$/,'').slice(0,16);
$('#bSk').onclick=e=>run(e.target,async()=>{
  const dari=$('#skD').value,sampai=$('#skS').value,id=$('#skB').value;let html,sheet;
  if(!id){const r=await api('rekapStok',{dari,sampai});
    const rows=[['Mutasi barang '+dari+' s/d '+sampai],[],['Barang','Satuan','Stok awal','Masuk','Terjual','Retur/hilang','Stok akhir']].concat(r.map(x=>[x.nama,x.satuan,x.awal,x.masuk,x.terjual,x.lain,x.akhir]));
    html=`<div class="wrap"><table><tr><th>Barang</th><th class="n">Awal</th><th class="n">Masuk</th><th class="n">Terjual</th><th class="n">Retur/hilang</th><th class="n">Akhir</th></tr>${r.map(x=>`<tr><td>${esc(x.nama)}</td><td class="n">${x.awal}</td><td class="n">${x.masuk}</td><td class="n">${x.terjual}</td><td class="n">${x.lain}</td><td class="n"><b>${x.akhir}</b></td></tr>`).join('')}</table></div>`;
    sheet={name:'Mutasi Barang',rows,headRow:2,boldRows:[0]};S.skNama='mutasi-barang-'+dari+'_'+sampai;}
  else{const r=await api('kartuStok',{idBarang:id,dari,sampai});
    const rows=[['Kartu stok: '+r.barang.nama+' ('+r.barang.satuan+')'],['Periode '+dari+' s/d '+sampai],[],['Waktu','Jenis','Keterangan','Masuk','Keluar','Saldo'],['','Saldo awal','','','',r.saldoAwal]].concat(r.baris.map(x=>[tw2(x.waktu),x.jenis,x.ket,x.masuk||'',x.keluar||'',x.saldo]));
    html=`<div class="mu">Stok sekarang: <b>${r.barang.stok}</b> ${esc(r.barang.satuan)}</div><div class="wrap"><table><tr><th>Waktu</th><th>Jenis</th><th>Ket.</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Saldo</th></tr><tr><td></td><td><b>Saldo awal</b></td><td></td><td></td><td></td><td class="n"><b>${r.saldoAwal}</b></td></tr>${r.baris.map(x=>`<tr><td>${esc(tw2(x.waktu))}</td><td>${esc(x.jenis)}</td><td>${esc(x.ket)}</td><td class="n">${x.masuk||''}</td><td class="n">${x.keluar||''}</td><td class="n">${x.saldo}</td></tr>`).join('')}</table></div>`;
    sheet={name:'Kartu Stok',rows,headRow:3,boldRows:[0]};S.skNama='kartu-stok-'+r.barang.nama.replace(/[^A-Za-z0-9]+/g,'-')+'_'+dari+'_'+sampai;}
  S.skSheet=sheet;$('#skR').innerHTML='<button class="btn sm alt" id="skXl" style="margin:8px 0">Unduh Excel</button>'+html;});
$('#skR').onclick=e=>{if(e.target.id==='skXl'&&S.skSheet)unduhXlsx(S.skNama,[S.skSheet]);};

// ===== rekap pesanan untuk pemasok =====
const addDs=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE');};
$('#rkT').value=addDs(D(),1);
const rkText=(r,p)=>`Pesanan untuk tanggal ${r.tanggal}\nKepada: ${p.pemasok}\n`+p.items.filter(i=>i.kirim>0).map(i=>`- ${i.nama}: ${i.kirim} ${i.satuan||''}`).join('\n')+`\n${r.ditutup?'Jumlah sudah final.':'Jumlah bisa bertambah sampai '+r.batas+'; kami kabari bila ada perubahan.'}\nMohon konfirmasi. Terima kasih.`;
$('#bRk').onclick=e=>run(e.target,async()=>{
  const r=await api('rekapPesanan',{tanggal:$('#rkT').value});S.rk=r;
  const st=r.ditutup?'<div class="cust"><b>Pemesanan sudah ditutup.</b> Jumlah di bawah sudah final.</div>':`<div class="warn"><b>Pemesanan masih dibuka</b> sampai ${esc(r.batas)}. Jumlah masih bisa bertambah, jadi kirim rekap final setelah ditutup.</div>`;
  $('#rkR').innerHTML=st+`<div class="mu" style="margin:6px 0">${r.jumlahPesanan} pesanan murid untuk tanggal ${esc(r.tanggal)}</div>`+
   (r.pemasok.length?r.pemasok.map((p,i)=>`<div class="card" style="margin-bottom:8px"><b>${esc(p.pemasok)}</b> <span class="tag">${p.total} porsi</span>
    <div class="wrap"><table><tr><th>Barang</th><th class="n">Dipesan</th><th class="n">Perlu dikirim</th></tr>${p.items.map(x=>`<tr><td>${esc(x.nama)}${x.jenis==='Pesan'?' <small class="mu">(sesuai pesanan)</small>':` <small class="mu">(stok ${x.stok})</small>`}</td><td class="n">${x.jumlah}</td><td class="n"><b>${x.kirim}</b></td></tr>`).join('')}</table></div>
    <div class="row" style="border:0;gap:6px;justify-content:flex-start;margin-top:6px"><button class="btn sm" data-rw="${i}">Kirim WhatsApp</button><button class="btn sm alt" data-rc="${i}">Salin teks</button></div></div>`).join('')+'<button class="btn alt sm" id="rkXl">Unduh Excel</button>':'<p class="mu">Belum ada pre-order untuk tanggal ini.</p>');});
$('#rkR').onclick=e=>{const d=e.target.dataset,r=S.rk;if(!r)return;
  if(d.rw!==undefined){const p=r.pemasok[d.rw],n=waNum(p.wa);if(!n)return toast('Nomor WhatsApp pemasok belum diisi',1);window.open('https://wa.me/'+n+'?text='+encodeURIComponent(rkText(r,p)),'_blank');}
  if(d.rc!==undefined)navigator.clipboard.writeText(rkText(r,r.pemasok[d.rc])).then(()=>toast('Teks rekap disalin'));
  if(e.target.id==='rkXl'){const rows=[['Rekap pesanan untuk pemasok, tanggal ambil '+r.tanggal],[],['Pemasok','Barang','Dipesan','Perlu dikirim']];r.pemasok.forEach(p=>p.items.forEach(x=>rows.push([p.pemasok,x.nama,x.jumlah,x.kirim])));unduhXlsx('rekap-pesanan-'+r.tanggal,[{name:'Rekap Pesanan',rows,headRow:2,boldRows:[0]}]);}};
}

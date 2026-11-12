const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const D=__dirname+'/';
let NOW=Date.parse('2026-11-02T06:30:00+07:00'); // Senin
class MD extends Date{constructor(...a){a.length?super(...a):super(NOW)}static now(){return NOW}}
// ---- mock layanan Google ----
const sheets={};
function Sheet(name){this.name=name;this.d=[];}
Sheet.prototype={
 appendRow(r){this.d.push(r.map(String))},setFrozenRows(){},getLastRow(){return this.d.length},
 getDataRange(){return {getDisplayValues:()=>this.d.map(r=>r.slice())}},
 deleteRow(i){this.d.splice(i-1,1)},deleteRows(i,n){this.d.splice(i-1,n)},
 getRange(r,c,nr=1,nc=1){const s=this;return{setNumberFormat(){return this},
  setValues(v){v.forEach((row,i)=>{s.d[r-1+i]=s.d[r-1+i]||[];row.forEach((x,j)=>s.d[r-1+i][c-1+j]=String(x))})},
  setValue(x){s.d[r-1]=s.d[r-1]||[];s.d[r-1][c-1]=String(x)},
  getDisplayValues(){const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++)row.push((s.d[r-1+i]||[])[c-1+j]??'');o.push(row)}return o},
  clearContent(){for(let i=0;i<nr;i++){const row=s.d[r-1+i];if(!row)continue;for(let j=0;j<nc;j++)row[c-1+j]='';}while(s.d.length&&s.d[s.d.length-1].every(x=>x===''))s.d.pop();}}}};
const SS={getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new Sheet(n)};
const jk=(d,o)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',...o}).formatToParts(d).reduce((a,p)=>(a[p.type]=p.value,a),{});
const ctx={console,JSON,Math,Date:MD,Object,Array,String,Number,isFinite,parseInt,
 SpreadsheetApp:{getActive:()=>SS},
 Session:{getScriptTimeZone:()=>'Asia/Jakarta'},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'u'},
  computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s).digest()].map(b=>b>127?b-256:b),
  formatDate(d,tz,f){const p=jk(d,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
   const wd=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(jk(d,{weekday:'short'}).weekday)+1;const H=p.hour==='24'?'00':p.hour;
   return f.replace('yyyy',p.year).replace('MM',p.month).replace('dd',p.day).replace('HH',H).replace('mm',p.minute).replace('ss',p.second).replace(/^u$/,wd)}},
 ContentService:{MimeType:{JSON:1},createTextOutput:t=>({t,setMimeType(){return this}})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 CacheService:{getScriptCache:()=>cache},
 MailApp:{sent:[],sendEmail(a,s,b){this.sent.push([a,b])},getRemainingDailyQuota:()=>100},
 Logger:{log:x=>console.log('LOG:',x)}};
const store={};const cache={get:k=>store[k]??null,put:(k,v)=>store[k]=v,remove:k=>delete store[k]};
vm.createContext(ctx);
vm.runInContext(['Code.gs','Presensi.gs','Biometrik.gs','Perangkat.gs','Laporan.gs','Operasional.gs','Notifikasi.gs','Tambahan.gs','Kelas.gs','Rfid.gs'].map(f=>fs.readFileSync(D+f,'utf8')).join('\n')+'\nthis.__doPost=doPost;this.__setup=setupAwal;this.__uji=ujiBeban;this.ringkasanTeks=ringkasanTeks;',ctx);
const post=(o,params={})=>JSON.parse(ctx.__doPost({postData:{contents:JSON.stringify(o)},parameter:params}).t);
let ok=0,bad=0;const T=(n,c,x)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+JSON.stringify(x)))};
(async()=>{
ctx.__setup();
let r=post({a:'login',u:'admin',p:'salah'});T('login salah ditolak',!r.ok,r);
r=post({a:'login',u:'admin',p:'GantiSaya123'});T('login admin benar + flag password awal',r.ok&&r.awal,r);const A=r.t;
r=post({a:'dashboard'});T('tanpa token ditolak',r.err==='SESI',r);
r=post({a:'pengaturan_set',t:A,v:{jam_batas_terlambat:'07:00',metode_aktif:'barcode,qr,nis,wajah,sidik'}});T('pengaturan_set',r.ok,r);
r=post({a:'pengaturan_set',t:A,v:{jam_mulai:'99:99'}});T('validasi jam salah ditolak',!r.ok,r);
r=post({a:'siswa_import',t:A,rows:[['1001','','Budi','7A','','08123','ortu@a.com'],['1002','','Ani','7A','BC-1002','',''],['1003','','Citra','7B','','',''],['x','','Bad','7A','','',''],['1001','','Dobel','7A','','','']]});
T('impor siswa 3 baru, 2 lewat',r.ok&&r.baru===3&&r.lewat===2,r);
r=post({a:'kelas_list',t:A});T('kelas dibuat otomatis (7A,7B)',r.v.length===2,r);
r=post({a:'login',u:'admin',p:'GantiSaya123'});
r=post({a:'petugas_save',t:A,v:{Username:'gate1',Nama:'Gerbang 1',Peran:'Petugas',Password:'rahasia123',Status:'Aktif'}});T('buat petugas',r.ok,r);
r=post({a:'login',u:'gate1',p:'rahasia123'});const G=r.t;T('login petugas',r.ok&&!r.awal,r);
r=post({a:'siswa_save',t:G,baru:true,v:{NIS:'9',Nama:'X'}});T('petugas ditolak aksi admin',!r.ok&&/ditolak/.test(r.err),r);
r=post({a:'guru_save',t:A,baru:true,v:{NIP:'G100',Nama:'Pak Guru'}});T('tambah guru',r.ok,r);
r=post({a:'guru_save',t:A,baru:true,v:{NIP:'1001',Nama:'Bentrok'}});T('guru bentrok NIS ditolak',!r.ok,r);
// --- presensi ---
NOW=Date.parse('2026-11-02T05:30:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'}]});T('sebelum jam mulai ditolak',r.res[0].err&&/belum dibuka/.test(r.res[0].err),r);
NOW=Date.parse('2026-11-02T06:45:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'},{kode:'BC-1002',metode:'barcode'},{kode:'G100',metode:'barcode'},{kode:'0000',metode:'barcode'}]});
T('hadir tepat waktu (NIS & kode barcode, guru, tak dikenal)',r.res[0].status==='Tepat waktu'&&r.res[1].ok&&r.res[2].ok&&r.res[3].err==='Tidak dikenali',r);
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'}]});T('presensi ganda terdeteksi',r.res[0].dup===1,r);
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'},{kode:'1001',metode:'barcode'}]});T('ganda dalam satu batch',r.res[0].dup&&r.res[1].dup,r);
NOW=Date.parse('2026-11-02T07:20:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1003',metode:'barcode'}]});T('terlambat + email ortu tidak ada',r.res[0].status==='Terlambat',r);
NOW=Date.parse('2026-11-02T08:30:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1003',metode:'barcode',jenis:'Pulang'}]});T('pulang (jenis eksplisit) setelah tutup dicatat',r.res[0].ok&&r.res[0].jenis==='Pulang',r);
NOW=Date.parse('2026-11-02T06:50:00+07:00');
post({a:'pengaturan_set',t:A,v:{metode_aktif:'nis'}});
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'wajah'}]});T('metode tidak aktif ditolak',r.res[0].err&&/tidak diaktifkan/.test(r.res[0].err),r);
post({a:'pengaturan_set',t:A,v:{metode_aktif:'barcode,qr,nis,wajah,sidik'}});
// waktu antrean: ts di masa depan harus diabaikan
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'barcode',jenis:'Pulang',ts:Date.parse('2026-11-02T20:00:00+07:00'),q:1}]});
const bar=ctx.__doPost&&sheets.PRESENSI.d.slice(-1)[0];T('ts masa depan dari antrean diabaikan (pakai jam server 06:50)',bar[2].startsWith('06:50'),bar);
// hari tidak aktif
NOW=Date.parse('2026-11-01T07:00:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'barcode'}]});T('Minggu = bukan hari aktif',/hari aktif/.test(r.res[0].err),r);
NOW=Date.parse('2026-11-02T09:00:00+07:00');
// perangkat
r=post({a:'perangkat_buat',t:A,nama:'Mesin 1'});T('buat kunci perangkat',r.ok&&r.key.length>30,r);const K=r.key;
NOW=Date.parse('2026-11-02T06:55:00+07:00');
r=post({type:'attlog',cloud_id:'X',data:{pin:'1002',scan:'2026-11-02 06:55'}},{src:'fingerspot',key:'salah'});T('kunci perangkat salah ditolak',!r.ok,r);
r=post({type:'attlog',cloud_id:'X',data:{pin:'1002',scan:'2026-11-02 06:55'}},{src:'fingerspot',key:K});T('webhook fingerspot: 1002 sudah masuk -> dup',r.ok&&r.res[0].dup===1,r);
post({a:'siswa_import',t:A,rows:[['1004','','Dewi','7B','','','']]});
r=post({type:'attlog',cloud_id:'X',data:{pin:'1004',scan:'2026-11-02 06:55'}},{src:'fingerspot',key:K});T('webhook fingerspot: 1004 masuk metode sidik',r.ok&&r.res[0].ok,r);
T('metode tercatat sidik, petugas perangkat:Mesin 1',sheets.PRESENSI.d.slice(-1)[0][8]==='sidik'&&sheets.PRESENSI.d.slice(-1)[0][11]==='perangkat:Mesin 1',sheets.PRESENSI.d.slice(-1)[0]);
r=post({type:'get_userinfo',data:{}},{src:'fingerspot',key:K});T('tipe non-attlog diabaikan',r.ok&&r.diabaikan,r);
r=post({a:'perangkat_status',t:A,id:'D001',status:'Nonaktif'});r=post({type:'attlog',data:{pin:'1001',scan:'2026-11-02 06:56'}},{src:'fingerspot',key:K});T('perangkat nonaktif ditolak',!r.ok,r);
// biometrik
const v=Array.from({length:128},(_,i)=>i/100);
r=post({a:'bio_save',t:A,nis:'1001',setuju:false,tpl:[v]});T('wajah tanpa persetujuan ditolak',!r.ok,r);
r=post({a:'bio_save',t:A,nis:'1001',setuju:true,tpl:[v,v,v]});T('simpan template wajah (3 sampel)',r.ok,r);
r=post({a:'bio_save',t:A,nis:'1001',setuju:true,tpl:[[1,2,3]]});T('template rusak ditolak',!r.ok,r);
r=post({a:'bio_save',t:G,nis:'1001',setuju:true,tpl:[v]});T('petugas tak boleh daftar wajah',!r.ok,r);
r=post({a:'bio_data',t:G});T('bio_data untuk petugas login',r.ok&&r.v.length===1&&r.v[0].t.length===3,r.v&&r.v.length);
r=post({a:'bio_data'});T('bio_data tanpa login ditolak',!r.ok,r);
r=post({a:'bio_status',t:A});T('bio_status admin',r.ok&&r.v[0].nis==='1001',r);
r=post({a:'presensi_data',t:G});T('presensi_data: orang tanpa email, ada foto field',r.ok&&r.orang.length>=4&&!('email' in r.orang[0])&&r.now>0,Object.keys(r.orang[0]));
r=post({a:'bio_hapus',t:A,nis:'1001'});T('hapus wajah',r.ok&&post({a:'bio_data',t:G}).v.length===0,r);
// laporan
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',tipe:'Siswa'});T('laporan siswa hari ini ('+r.total+' baris)',r.ok&&r.total>=4,r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',status:'Terlambat',tipe:'Siswa'});T('filter Terlambat',r.v.every(x=>x.Status==='Terlambat')&&r.total===1,r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',status:'Belum presensi',tipe:'Siswa'});T('Belum presensi = 0 (3 siswa semua sudah)',r.total===0,r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',tipe:'Guru'});T('laporan guru',r.total===1,r);
r=post({a:'laporan',t:G,dari:'2026-11-02'});T('petugas ditolak laporan',!r.ok,r);
r=post({a:'izin_simpan',t:A,nis:'1003',jenis:'Sakit',tgl:'2026-11-03'});T('catat sakit tgl lain',r.ok,r);
r=post({a:'izin_simpan',t:A,nis:'1003',jenis:'Sakit',tgl:'2026-11-03'});T('izin ganda ditolak',!r.ok,r);
r=post({a:'rekap',t:A,bulan:'2026-11',kelas:''});const b=r.v.find(x=>x.nis==='1003');T('rekap: 1003 terlambat1, sakit1',b.t===1&&b.s===1,b);
const a1=r.v.find(x=>x.nis==='1001');T('rekap: 1001 hadir1 persen',a1.h===1&&a1.pct>0,a1);
r=post({a:'dashboard',t:A});T('dashboard',r.ok&&r.v.total===4&&r.v.sudah===4&&r.v.terlambat===1&&r.v.tren.length===7,r.v);
// ---- notifikasi (terlambat & tidak hadir) ----
post({a:'siswa_import',t:A,rows:[['1005','','Eko','7A','','08122222','eko@a.com'],['1006','','Fira','7A','','08133333',''],['1007','','Gita','7B','','','gita@a.com'],['1008','','Hana','7B','','08144444','hana@a.com']]});
NOW=Date.parse('2026-11-02T07:30:00+07:00');
let m0=ctx.MailApp.sent.length;
r=post({a:'hadir',t:G,items:[{kode:'1005',metode:'barcode'}]});T('1005 terlambat tercatat',r.res[0].status==='Terlambat',r);
T('email otomatis terkirim ke orang tua 1005',ctx.MailApp.sent.length===m0+1&&ctx.MailApp.sent[m0][0]==='eko@a.com',ctx.MailApp.sent.slice(m0));
r=post({a:'notif_list',t:A,tgl:'2026-11-02',jenis:'Terlambat'});
const n5=r.v.find(x=>x.nis==='1005'),n3=r.v.find(x=>x.nis==='1003');
T('terlambat 1005: Email Terkirim, WA Menunggu, nomor 62..., pesan memuat jam',n5.email==='Terkirim'&&n5.wa==='Menunggu'&&n5.nomor==='628122222'&&/07:30/.test(n5.pesan)&&/terlambat/.test(n5.pesan),n5);
T('terlambat 1003 tanpa kontak: keduanya Tanpa kontak',n3.email==='Tanpa kontak'&&n3.wa==='Tanpa kontak',n3);
r=post({a:'notif_tandai',t:A,id:n5.id,status:'Terkirim'});T('tandai WA terkirim',r.ok,r);
T('status WA 1005 jadi Terkirim',post({a:'notif_list',t:A,tgl:'2026-11-02'}).v.find(x=>x.nis==='1005').wa==='Terkirim');
r=post({a:'notif_tandai',t:A,id:n3.id,status:'Terkirim'});T('tandai pada Tanpa kontak ditolak',!r.ok,r);
r=post({a:'notif_tandai',t:G,id:n5.id,status:'Menunggu'});T('petugas tak boleh kelola notifikasi',!r.ok,r);
post({a:'pengaturan_set',t:A,v:{notif_ortu:'tidak'}});m0=ctx.MailApp.sent.length;
NOW=Date.parse('2026-11-02T07:31:00+07:00');
post({a:'hadir',t:G,items:[{kode:'1007',metode:'barcode'}]});
T('notif_ortu=tidak: email tidak terkirim otomatis, status Menunggu',ctx.MailApp.sent.length===m0&&post({a:'notif_list',t:A,tgl:'2026-11-02'}).v.find(x=>x.nis==='1007').email==='Menunggu');
post({a:'pengaturan_set',t:A,v:{notif_ortu:'ya'}});
r=post({a:'notif_email',t:A,jenis:'Terlambat'});T('kirim email menunggu (1 terkirim)',r.ok&&r.kirim===1&&ctx.MailApp.sent.length===m0+1,r);
T('1007 jadi Terkirim',post({a:'notif_list',t:A,tgl:'2026-11-02'}).v.find(x=>x.nis==='1007').email==='Terkirim');
NOW=Date.parse('2026-11-02T07:45:00+07:00');
r=post({a:'notif_siapkan',t:A});T('siapkan tidak hadir sebelum presensi berakhir ditolak',!r.ok&&/berakhir/.test(r.err),r);
NOW=Date.parse('2026-11-02T09:00:00+07:00');
r=post({a:'notif_siapkan',t:G});T('petugas ditolak siapkan notifikasi',!r.ok,r);
r=post({a:'notif_siapkan',t:A});T('siapkan tidak hadir: 2 siswa (1006,1008)',r.ok&&r.baru===2,r);
r=post({a:'notif_siapkan',t:A});T('siapkan ulang tidak membuat baris ganda',r.ok&&r.baru===0,r);
r=post({a:'notif_list',t:A,tgl:'2026-11-02',jenis:'Tidak hadir'});
const h6=r.v.find(x=>x.nis==='1006'),h8=r.v.find(x=>x.nis==='1008');
T('tidak hadir 1006: email Tanpa kontak, WA Menunggu',h6.email==='Tanpa kontak'&&h6.wa==='Menunggu'&&/belum tercatat hadir/.test(h6.pesan),h6);
T('tidak hadir 1008: email Menunggu, WA Menunggu',h8.email==='Menunggu'&&h8.wa==='Menunggu',h8);
m0=ctx.MailApp.sent.length;
r=post({a:'notif_email',t:A,jenis:'Tidak hadir'});T('email massal tidak hadir (1 terkirim ke hana)',r.ok&&r.kirim===1&&ctx.MailApp.sent[m0][0]==='hana@a.com',r);
r=post({a:'izin_simpan',t:A,nis:'1006',jenis:'Sakit',tgl:'2026-11-02'});
post({a:'notif_siapkan',t:A});
T('siswa yang kemudian izin/sakit: WA dibatalkan',post({a:'notif_list',t:A,tgl:'2026-11-02',jenis:'Tidak hadir'}).v.find(x=>x.nis==='1006').wa==='Dibatalkan');
r=post({a:'ganti_password',t:A,lama:'x',baru:'passwordbaru1'});T('ganti password: lama salah ditolak',!r.ok,r);
r=post({a:'ganti_password',t:A,lama:'GantiSaya123',baru:'passwordbaru1'});T('ganti password',r.ok,r);
r=post({a:'login',u:'admin',p:'passwordbaru1'});T('login password baru, flag awal mati',r.ok&&!r.awal,r);
for(let i=0;i<5;i++)post({a:'login',u:'gate1',p:'salah'});
r=post({a:'login',u:'gate1',p:'rahasia123'});T('akun terkunci setelah 5 gagal',!r.ok&&/Terlalu banyak/.test(r.err),r);

// ---- fitur tambahan: jadwal, wali kelas, koreksi, manual, izin multi-hari, ringkasan ----
NOW=Date.parse('2026-11-02T09:30:00+07:00');
r=post({a:'jadwal_save',t:A,v:{Jenis:'Hari',Kunci:'1',Mulai:'06:00',Batas:'07:30',Selesai:'09:00',Pulang:'12:00',Keterangan:'Upacara'}});T('jadwal hari Senin disimpan (batas 07:30)',r.ok,r);
r=post({a:'jadwal_save',t:A,v:{Jenis:'Hari',Kunci:'1',Mulai:'09:00',Batas:'08:00',Selesai:'10:00',Pulang:'12:00'}});T('jadwal dengan urutan jam salah ditolak',!r.ok,r);
r=post({a:'jadwal_save',t:G,v:{Jenis:'Hari',Kunci:'2',Mulai:'06:00',Batas:'07:00',Selesai:'08:00',Pulang:'12:00'}});T('petugas tak boleh ubah jadwal',!r.ok,r);
post({a:'siswa_import',t:A,rows:[['2001','','Jaya','7A','','',''],['2002','','Kiki','7A','','',''],['2003','','Lina','7B','','','']]});
NOW=Date.parse('2026-11-02T07:20:00+07:00'); // Senin 07:20: batas hari ini 07:30 -> TEPAT WAKTU (batas umum 07:00)
r=post({a:'hadir',t:G,items:[{kode:'2001',metode:'barcode'}]});T('jadwal Senin: 07:20 masih Tepat waktu',r.res[0].status==='Tepat waktu',r);
r=post({a:'presensi_data',t:G});T('presensi_data memakai jadwal hari itu (batas 07:30)',r.st.jam_batas_terlambat==='07:30'&&r.st.jam_selesai==='09:00',r.st);
NOW=Date.parse('2026-11-02T08:55:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'2002',metode:'barcode'}]});T('jadwal Senin: berakhir 09:00, 08:55 masih diterima (Terlambat)',r.res[0].ok&&r.res[0].status==='Terlambat',r);
post({a:'jadwal_save',t:A,v:{Jenis:'Tanggal',Kunci:'2026-11-02',Mulai:'06:00',Batas:'06:30',Selesai:'07:00',Pulang:'11:00',Keterangan:'Ujian'}});
r=post({a:'hadir',t:G,items:[{kode:'2003',metode:'barcode'}]});T('jadwal tanggal khusus menimpa jadwal hari: 08:55 ditutup (berakhir 07:00)',r.res[0].err&&/ditutup/.test(r.res[0].err),r);
r=post({a:'jadwal_hapus',t:A,jenis:'Tanggal',kunci:'2026-11-02'});T('hapus jadwal khusus',r.ok,r);
r=post({a:'jadwal_hapus',t:A,jenis:'Hari',kunci:'1'});
// wali kelas
r=post({a:'petugas_save',t:A,v:{Username:'wali7a',Nama:'Bu Sari',Peran:'Wali',Kelas:'ZZ',Password:'walikelas1',Status:'Aktif'}});T('wali dengan kelas tak ada ditolak',!r.ok,r);
r=post({a:'petugas_save',t:A,v:{Username:'wali7a',Nama:'Bu Sari',Peran:'Wali',Kelas:'7A',Password:'walikelas1',Status:'Aktif'}});T('buat akun wali kelas 7A',r.ok,r);
r=post({a:'login',u:'wali7a',p:'walikelas1'});const W=r.t;T('login wali, kelas terbawa',r.ok&&r.u.peran==='Wali'&&r.u.kelas==='7A',r.u);
NOW=Date.parse('2026-11-02T10:00:00+07:00');
r=post({a:'dashboard',t:W});T('dashboard wali hanya kelas 7A',r.ok&&r.v.kelas.length===1&&r.v.kelas[0].nama==='7A',r.v&&r.v.kelas);
r=post({a:'laporan',t:W,dari:'2026-11-02',sampai:'2026-11-02',kelas:'7B'});T('wali minta kelas 7B -> tetap dipaksa 7A',r.ok&&r.v.length>0&&r.v.every(x=>x.Kelas==='7A'),r.v&&r.v.map(x=>x.Kelas));
r=post({a:'rekap',t:W,bulan:'2026-11',kelas:'7B'});T('rekap wali hanya 7A',r.ok&&r.v.every(x=>x.kelas==='7A'),r.v&&r.v.map(x=>x.kelas));
r=post({a:'siswa_kelas',t:W,kelas:'7B'});T('siswa_kelas wali: hanya 7A',r.ok&&r.kelas==='7A'&&r.v.length>=3,r);
r=post({a:'siswa_kelas',t:G});T('petugas biasa ditolak siswa_kelas',!r.ok,r);
r=post({a:'izin_simpan',t:W,nis:'2003',jenis:'Sakit',tgl:'2026-11-03'});T('wali tak boleh catat izin siswa kelas lain',!r.ok&&/bukan di kelas/.test(r.err),r);
// izin multi hari: Rabu 4 s/d Senin 9 Nov -> hari aktif Rabu,Kamis,Jumat,Senin = 4 (Sabtu/Minggu dilewati)
r=post({a:'izin_simpan',t:W,nis:'2001',jenis:'Sakit',tgl:'2026-11-04',sampai:'2026-11-09',ket:'Demam'});T('izin 4-9 Nov: 4 hari aktif tercatat, 2 dilewati',r.ok&&r.n===4&&r.lewat===2,r);
r=post({a:'izin_simpan',t:W,nis:'2001',jenis:'Izin',tgl:'2026-11-04',sampai:'2026-11-09'});T('izin ganda untuk rentang sama ditolak',!r.ok,r);
r=post({a:'notif_siapkan',t:W});T('wali tak boleh kelola notifikasi',!r.ok,r);
r=post({a:'petugas_list',t:W});T('wali tak boleh lihat daftar petugas',!r.ok,r);
r=post({a:'presensi_koreksi',t:W,id:'x',alasan:'tes'});T('wali tak boleh membatalkan presensi',!r.ok,r);
// koreksi
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',nama:'Jaya'});const idJ=r.v[0].ID;T('laporan memuat ID presensi',!!idJ&&r.v.length===1,r.v);
r=post({a:'presensi_koreksi',t:A,id:idJ,alasan:''});T('koreksi tanpa alasan ditolak',!r.ok,r);
r=post({a:'presensi_koreksi',t:A,id:idJ,alasan:'Salah scan kartu teman'});T('presensi dibatalkan',r.ok,r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',nama:'Jaya'});T('laporan default tidak memuat yang dibatalkan',r.v.length===0,r.v);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',nama:'Jaya',status:'Dibatalkan'});T('laporan status Dibatalkan menampilkan jejak + alasan',r.v.length===1,r.v);
r=post({a:'presensi_koreksi',t:A,id:idJ,alasan:'ulang'});T('batal dua kali ditolak',!r.ok,r);
r=post({a:'presensi_data',t:G});T('yang dibatalkan hilang dari sinkron (bisa scan ulang)',!('2001|Masuk' in r.sudah),Object.keys(r.sudah));
NOW=Date.parse('2026-11-02T06:40:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'2001',metode:'barcode'}]});T('setelah dibatalkan, siswa bisa scan ulang',r.res[0].ok,r);
// manual
NOW=Date.parse('2026-11-02T10:00:00+07:00');
r=post({a:'presensi_manual',t:A,nis:'2002',tgl:'2026-11-02',jam:'07:10',jenis:'Pulang',alasan:'Scanner rusak'});T('presensi manual pulang',r.ok&&r.status==='Pulang',r);
r=post({a:'presensi_manual',t:A,nis:'2002',tgl:'2026-11-02',jam:'07:10',jenis:'Pulang',alasan:'dobel'});T('manual ganda ditolak',!r.ok,r);
r=post({a:'presensi_manual',t:A,nis:'2003',tgl:'2026-11-09',jam:'07:00',jenis:'Masuk',alasan:'masa depan'});T('manual tanggal masa depan ditolak',!r.ok,r);
r=post({a:'presensi_manual',t:A,nis:'2003',tgl:'2026-11-02',jam:'07:00',jenis:'Masuk',alasan:''});T('manual tanpa alasan ditolak',!r.ok,r);
r=post({a:'presensi_manual',t:A,nis:'2003',tgl:'2026-11-02',jam:'07:00',jenis:'Masuk',alasan:'Lupa scan, dicek wali kelas'});T('manual masuk lupa scan (batas 07:00 -> Tepat waktu)',r.ok&&r.status==='Tepat waktu',r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',nama:'Lina'});T('manual tercatat metode Manual',r.v[0].Metode==='Manual',r.v);
// ringkasan harian
NOW=Date.parse('2026-11-02T09:00:00+07:00');
const tx=ctx.ringkasanTeks();T('ringkasan harian berisi total & per kelas',/Siswa aktif:/.test(tx)&&/7A:/.test(tx)&&/Presensi berakhir pukul/.test(tx),tx);
NOW=Date.parse('2026-11-01T09:00:00+07:00');T('ringkasan kosong di hari tidak aktif',ctx.ringkasanTeks()==='');
NOW=Date.parse('2026-11-02T09:00:00+07:00');


// ---- petugas: daftar belum presensi + catat izin/sakit ----
r=post({a:'petugas_save',t:A,v:{Username:'gate3',Nama:'Gerbang 3',Peran:'Petugas',Password:'rahasia333',Status:'Aktif'}});
r=post({a:'login',u:'gate3',p:'rahasia333'});const G3=r.t;
r=post({a:'petugas_save',t:A,v:{Username:'gate4',Nama:'Gerbang 4',Peran:'Petugas',Password:'rahasia444',Status:'Aktif'}});
r=post({a:'login',u:'gate4',p:'rahasia444'});const G4=r.t;
NOW=Date.parse('2026-11-02T10:00:00+07:00');
r=post({a:'belum_hadir',t:G3});T('daftar belum presensi terkunci sebelum password diverifikasi',!r.ok&&/terkunci/.test(r.err),r);
r=post({a:'izin_simpan',t:G3,nis:'1008',jenis:'Sakit',tgl:'2026-11-02'});T('petugas belum membuka area: catat izin ditolak (terkunci)',!r.ok&&/terkunci/.test(r.err),r);
r=post({a:'buka_manual',t:G3,password:'rahasia333'});T('petugas membuka area petugas dengan password',r.ok,r);
r=post({a:'belum_hadir',t:G3});
T('petugas melihat daftar belum presensi (termasuk kontak ortu)',r.ok&&r.v.some(x=>x.nis==='1008'&&x.wa==='628144444')&&!r.v.some(x=>x.nis==='1006'||x.nis==='1001'),r.v&&r.v.map(x=>x.nis));
T('ringkasan: hadir/izin/total konsisten',r.hadir+r.izin+r.v.length===r.total,[r.hadir,r.izin,r.v.length,r.total]);
const totSemua=post({a:'belum_hadir',t:G3}).total;
r=post({a:'belum_hadir',t:W});T('wali hanya mencakup kelasnya (7A): total lebih kecil dari seluruh sekolah, daftar hanya 7A',r.ok&&r.total>0&&r.total<totSemua&&r.v.every(x=>x.kelas==='7A'),[r.total,totSemua]);
r=post({a:'belum_hadir'});T('tanpa login ditolak',r.err==='SESI',r);
r=post({a:'izin_simpan',t:G3,nis:'1008',jenis:'Sakit',tgl:'2026-11-02',ket:'Orang tua menelepon'});T('PETUGAS boleh mencatat sakit',r.ok&&r.n===1,r);
r=post({a:'belum_hadir',t:G3});T('setelah dicatat sakit, hilang dari daftar belum presensi',!r.v.some(x=>x.nis==='1008'),r.v.map(x=>x.nis));
r=post({a:'izin_simpan',t:G3,nis:'1007',jenis:'Izin',tgl:'2026-11-02',sampai:'2026-11-20'});T('petugas dibatasi maksimal 7 hari',!r.ok&&/7 hari/.test(r.err),r);
r=post({a:'izin_simpan',t:G3,nis:'1007',jenis:'Izin',tgl:'2026-10-01'});T('petugas tak boleh mencatat izin terlalu lampau',!r.ok&&/7 hari/.test(r.err),r);
r=post({a:'izin_simpan',t:A,nis:'1007',jenis:'Izin',tgl:'2026-10-26',sampai:'2026-10-28'});T('admin tetap tanpa batas 7 hari ke belakang',r.ok,r);
r=post({a:'laporan',t:G3,dari:'2026-11-02'});T('petugas tetap tidak boleh buka laporan',!r.ok,r);
r=post({a:'presensi_koreksi',t:G3,id:'x',alasan:'tes'});T('petugas tak boleh membatalkan presensi/izin',!r.ok,r);


// ---- input NIS manual: khusus petugas, terkunci, butuh password + konfirmasi ----
NOW=Date.parse('2026-11-02T06:45:00+07:00');
delete store['f:gate1']; // pembersihan kunci login dari uji sebelumnya
post({a:'siswa_import',t:A,rows:[['3001','','Mira','7A','','',''],['3002','','Nana','7B','','','']]});
r=post({a:'hadir',t:G,items:[{kode:'3001',metode:'nis',konf:true}]});T('NIS manual tanpa membuka akses ditolak (terkunci)',r.res[0].err&&/terkunci/.test(r.res[0].err),r);
r=post({a:'buka_manual',t:G,password:'salah'});T('buka manual dengan password salah ditolak',!r.ok,r);
r=post({a:'buka_manual',t:W,password:'walikelas1'});T('wali kelas tidak boleh membuka input manual',!r.ok&&/petugas/.test(r.err),r);
r=post({a:'buka_manual',t:G,password:'rahasia123'});T('buka manual dengan password benar',r.ok&&r.detik===300,r);
r=post({a:'hadir',t:G,items:[{kode:'3001',metode:'nis'}]});T('NIS manual tanpa konfirmasi identitas ditolak',r.res[0].err&&/dikonfirmasi/.test(r.res[0].err),r);
r=post({a:'hadir',t:G,items:[{kode:'3001',metode:'nis',konf:true}]});T('NIS manual terkonfirmasi diterima',r.res[0].ok,r);
r=post({a:'laporan',t:A,dari:'2026-11-02',sampai:'2026-11-02',nama:'Mira'});T('catatan manual tercatat metode nis + keterangan audit',r.v[0].Metode==='nis',r.v);
const ketM=sheets.PRESENSI.d.find(x=>x[3]==='3001');T('keterangan menyebut input manual dikonfirmasi petugas',/Input manual/.test(ketM[10]),ketM);
r=post({a:'hadir',t:W,items:[{kode:'3002',metode:'nis',konf:true}]});T('wali tidak boleh input NIS manual walau diminta',r.res[0].err&&/petugas/.test(r.res[0].err),r);
r=post({a:'kunci_manual',t:G});r=post({a:'hadir',t:G,items:[{kode:'3002',metode:'nis',konf:true}]});T('setelah dikunci kembali, manual ditolak lagi',r.res[0].err&&/terkunci/.test(r.res[0].err),r);
r=post({a:'hadir',t:G,items:[{kode:'3002',metode:'barcode'}]});T('scan barcode tetap berjalan tanpa akses manual',r.res[0].ok,r);
post({a:'buka_manual',t:A,password:'passwordbaru1'});
r=post({a:'hadir',t:A,items:[{kode:'3001',metode:'nis',konf:true}]});T('admin dengan akses terbuka: NIS manual diproses (dup krn sudah tercatat)',r.res[0].dup===1,r);
// kunci akun setelah 5 kali salah (token petugas lain agar tidak mengganggu uji lain)
r=post({a:'petugas_save',t:A,v:{Username:'gate2',Nama:'Gerbang 2',Peran:'Petugas',Password:'rahasia456',Status:'Aktif'}});
const G2=post({a:'login',u:'gate2',p:'rahasia456'}).t;
for(let k=0;k<5;k++)post({a:'buka_manual',t:G2,password:'x'+k});
r=post({a:'buka_manual',t:G2,password:'rahasia456'});T('buka manual terkunci setelah 5 kali password salah',!r.ok&&/Terlalu banyak/.test(r.err),r);

// ---- kartu bermasalah / lupa bawa kartu ----
NOW=Date.parse('2026-11-03T06:45:00+07:00');
r=post({a:'hadir',t:G3,items:[{kode:'1005',metode:'tanpa_kartu',ket:'Lupa bawa kartu',jenis:'Masuk',konf:true}]});T('lupa bawa kartu: dicatat hadir (tepat waktu)',r.res[0].ok&&r.res[0].status==='Tepat waktu',r);
const lrw=sheets.PRESENSI.d.slice(-1)[0];T('tercatat metode tanpa_kartu + keterangan alasan',lrw[8]==='tanpa_kartu'&&/Lupa bawa kartu/.test(lrw[10]),lrw);
r=post({a:'hadir',t:G3,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Kartu bermasalah',jenis:'Masuk'}]});T('tanpa konfirmasi identitas ditolak',r.res[0].err&&/dikonfirmasi/.test(r.res[0].err),r);
r=post({a:'hadir',t:G3,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Alasan bebas',jenis:'Masuk',konf:true}]});T('alasan di luar dua pilihan resmi ditolak',r.res[0].err&&/Alasan tidak valid/.test(r.res[0].err),r);
r=post({a:'hadir',t:G4,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Kartu bermasalah',jenis:'Masuk',konf:true}]});T('petugas yang belum membuka area: tanpa_kartu ditolak (terkunci)',r.res[0].err&&/terkunci/.test(r.res[0].err),r);
r=post({a:'hadir',t:W,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Kartu bermasalah',jenis:'Masuk',konf:true}]});T('wali kelas tak boleh mencatat tanpa_kartu',r.res[0].err&&/petugas/.test(r.res[0].err),r);
r=post({a:'belum_hadir',t:G4});T('petugas lain belum membuka: daftar belum presensi terkunci',!r.ok&&/terkunci/.test(r.err),r);
post({a:'buka_manual',t:G4,password:'rahasia444'});
r=post({a:'hadir',t:G4,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Kartu bermasalah',jenis:'Masuk',konf:true}]});T('kartu bermasalah: dicatat setelah area dibuka dan dikonfirmasi',r.res[0].ok,r);
r=post({a:'hadir',t:G4,items:[{kode:'2002',metode:'tanpa_kartu',ket:'Kartu bermasalah',jenis:'Masuk',konf:true}]});T('kartu bermasalah dua kali: terdeteksi sudah presensi',r.res[0].dup===1,r);
r=post({a:'laporan',t:A,dari:'2026-11-03',sampai:'2026-11-03',metode:'tanpa_kartu'});T('laporan memuat metode tanpa_kartu beserta keterangan',r.total===2&&r.v.every(x=>/dikonfirmasi petugas/.test(x.Keterangan)),r.v);
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- pengaturan: kunci area petugas bisa dimatikan ----
r=post({a:'petugas_save',t:A,v:{Username:'gate5',Nama:'Gerbang 5',Peran:'Petugas',Password:'rahasia555',Status:'Aktif'}});
r=post({a:'login',u:'gate5',p:'rahasia555'});const G5=r.t;
NOW=Date.parse('2026-11-03T06:50:00+07:00');
r=post({a:'belum_hadir',t:G5});T('kunci aktif (bawaan): daftar belum presensi terkunci',!r.ok&&/terkunci/.test(r.err),r);
r=post({a:'pengaturan_set',t:A,v:{kunci_petugas:'tidak'}});T('admin menonaktifkan kunci petugas',r.ok,r);
r=post({a:'belum_hadir',t:G5});T('kunci nonaktif: petugas langsung bisa membuka daftar belum presensi',r.ok,r);
r=post({a:'hadir',t:G5,items:[{kode:'2003',metode:'tanpa_kartu',ket:'Lupa bawa kartu',jenis:'Masuk'}]});T('kunci nonaktif: konfirmasi identitas tetap wajib',r.res[0].err&&/dikonfirmasi/.test(r.res[0].err),r);
r=post({a:'hadir',t:G5,items:[{kode:'2003',metode:'tanpa_kartu',ket:'Lupa bawa kartu',jenis:'Masuk',konf:true}]});T('kunci nonaktif: tanpa_kartu dicatat tanpa password',r.res[0].ok,r);
r=post({a:'hadir',t:W,items:[{kode:'1006',metode:'nis',jenis:'Masuk',konf:true}]});T('kunci nonaktif: wali tetap tidak boleh input NIS manual',r.res[0].err&&/petugas/.test(r.res[0].err),r);
r=post({a:'presensi_data',t:G5});T('halaman presensi menerima status kunci (kunci_petugas=tidak)',r.st.kunci_petugas==='tidak',r.st.kunci_petugas);
r=post({a:'pengaturan_set',t:A,v:{kunci_petugas:'mungkin'}});T('nilai kunci_petugas tidak valid ditolak',!r.ok,r);
post({a:'pengaturan_set',t:A,v:{kunci_petugas:'ya'}});
r=post({a:'belum_hadir',t:G5});T('kunci diaktifkan kembali: terkunci lagi',!r.ok&&/terkunci/.test(r.err),r);
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- teks pesan WA/email bisa diatur ----
r=post({a:'pengaturan_set',t:A,v:{pesan_terlambat:'pendek'}});T('teks pesan terlalu pendek ditolak',!r.ok,r);
r=post({a:'pengaturan_set',t:A,v:{pesan_terlambat:'Halo {nama} ({kelas}) terlambat {jam} tgl {tanggal} - {sekolah} {tidakada}',pesan_belum:'Halo {nama} dari {kelas}, belum hadir {tanggal}. {sekolah}'}});T('admin mengubah teks pesan',r.ok,r);
post({a:'siswa_import',t:A,rows:[['4001','','Rani','7A','','08155555','rani@a.com']]});
NOW=Date.parse('2026-11-04T07:40:00+07:00');
let mm=ctx.MailApp.sent.length;
r=post({a:'hadir',t:G3,items:[{kode:'4001',metode:'nis',jenis:'Masuk',konf:true}]});
const body=(ctx.MailApp.sent[mm]||[])[1]||'';
T('email terlambat memakai teks buatan admin (penanda terisi, penanda asing dibiarkan)',/^Halo Rani \(7A\) terlambat 07:40 tgl 04-11-2026 - Sekolah Kami \{tidakada\}$/.test(body),body);
r=post({a:'notif_list',t:A,tgl:'2026-11-04',jenis:'Terlambat'});T('daftar notifikasi: tautan WA terlambat memakai teks yang sama',r.v.find(x=>x.nis==='4001').pesan===body,r.v.map(x=>x.pesan));
NOW=Date.parse('2026-11-04T09:00:00+07:00');
r=post({a:'notif_siapkan',t:A});
r=post({a:'notif_list',t:A,tgl:'2026-11-04',jenis:'Tidak hadir'});T('pesan tidak hadir memakai teks buatan admin',r.v.length>0&&r.v.every(x=>/^Halo .+ dari .+, belum hadir 04-11-2026\. Sekolah Kami$/.test(x.pesan)),r.v.slice(0,2).map(x=>x.pesan));
r=post({a:'presensi_data',t:G5});T('halaman presensi menerima teks pesan_belum untuk tautan WA',/belum hadir \{tanggal\}/.test(r.st.pesan_belum),r.st.pesan_belum);
post({a:'pengaturan_set',t:A,v:{pesan_terlambat:'Yth. Orang tua/wali {nama} (kelas {kelas}). Kami informasikan bahwa {nama} tercatat terlambat tiba di sekolah pada {tanggal} pukul {jam}. Terima kasih. {sekolah}',pesan_belum:'Yth. Orang tua/wali {nama} (kelas {kelas}). Kami informasikan bahwa {nama} belum tercatat hadir di sekolah pada {tanggal}. Mohon konfirmasi bila berhalangan hadir (izin/sakit). Terima kasih. {sekolah}'}});
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- cache singkat: tetap benar setelah data diubah ----
post({a:'siswa_import',t:A,rows:[['5001','','Cache Satu','7A','','','']]});
NOW=Date.parse('2026-11-04T06:45:00+07:00');
r=post({a:'hadir',t:G3,items:[{kode:'5001',metode:'nis',jenis:'Masuk',konf:true}]});T('siswa baru langsung dikenali (cache dibersihkan saat impor)',r.res[0].ok&&r.res[0].nama==='Cache Satu',r);
r=post({a:'hadir',t:G3,items:[{kode:'5001',metode:'nis',jenis:'Masuk',konf:true}]});
post({a:'siswa_save',t:A,baru:false,v:{NIS:'5001',Nama:'Cache Dua',ID_Kelas:'7A',Status:'Aktif'}});
r=post({a:'hadir',t:G3,items:[{kode:'5001',metode:'nis',jenis:'Pulang',konf:true}]});T('nama yang diubah langsung terpakai (cache dibersihkan saat edit)',r.res[0].nama==='Cache Dua',r);
post({a:'siswa_save',t:A,baru:false,v:{NIS:'5001',Nama:'Cache Dua',ID_Kelas:'7A',Status:'Nonaktif'}});
r=post({a:'hadir',t:G3,items:[{kode:'5001',metode:'nis',jenis:'Masuk',konf:true}]});T('siswa dinonaktifkan langsung tidak dikenali',r.res[0].err==='Tidak dikenali',r);
post({a:'pengaturan_set',t:A,v:{jam_batas_terlambat:'06:30'}});
post({a:'siswa_import',t:A,rows:[['5002','','Cache Tiga','7A','','','']]});
r=post({a:'hadir',t:G3,items:[{kode:'5002',metode:'nis',jenis:'Masuk',konf:true}]});T('pengaturan yang diubah langsung terpakai (batas 06:30 -> terlambat)',r.res[0].status==='Terlambat',r);
post({a:'pengaturan_set',t:A,v:{jam_batas_terlambat:'07:00'}});
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- presensi per pelajaran (guru): kelas reguler + kelas mapel pilihan ----
NOW=Date.parse('2026-11-05T06:30:00+07:00'); // Kamis
r=post({a:'petugas_save',t:A,v:{Username:'pakguru',Nama:'Pak Guru',Peran:'Guru',NIP:'XX999',Password:'guru12345',Status:'Aktif'}});T('akun guru dengan NIP tak terdaftar ditolak',!r.ok&&/NIP guru/.test(r.err),r);
r=post({a:'petugas_save',t:A,v:{Username:'pakguru',Nama:'Pak Guru',Peran:'Guru',NIP:'G100',Password:'guru12345',Status:'Aktif'}});T('buat akun guru (NIP G100)',r.ok,r);
r=post({a:'login',u:'pakguru',p:'guru12345'});const GU=r.t;T('login guru: peran Guru + NIP terbawa',r.ok&&r.u.peran==='Guru'&&r.u.nip==='G100',r.u);
post({a:'guru_save',t:A,baru:true,v:{NIP:'G200',Nama:'Bu Guru Dua'}});
r=post({a:'login',u:'pakguru',p:'guru12345'});
post({a:'petugas_save',t:A,v:{Username:'buguru2',Nama:'Bu Guru Dua',Peran:'Guru',NIP:'G200',Password:'guru22222',Status:'Aktif'}});
r=post({a:'login',u:'buguru2',p:'guru22222'});const GU2=r.t;
const imp=[['Kimia','Kimia','G100','1001'],['Kimia','Kimia','G100','1002'],['Kimia','Kimia','G100','1003'],['Bahasa Jerman','Bahasa','G200','1004'],['Bahasa Jerman','Bahasa','G200','9999'],['Salah','Mapel','G404','1001']];
r=post({a:'kelompok_import',t:GU,rows:imp});T('guru tak boleh impor kelompok',!r.ok,r);
r=post({a:'kelompok_import',t:A,rows:imp});T('impor kelompok: 2 baru, anggota 4, kesalahan dilaporkan (NIS & NIP tak ada)',r.ok&&r.baru===2&&r.anggota===4&&r.err.length===2,r);
r=post({a:'kelompok_list',t:GU});T('guru hanya melihat kelompok miliknya (Kimia)',r.ok&&r.v.length===1&&r.v[0].Nama==='Kimia'&&r.v[0].Anggota===3&&r.v[0].Guru==='Pak Guru',r.v);
const idKimia=r.v[0].ID;
r=post({a:'kelompok_list',t:A});T('admin melihat semua kelompok',r.v.length===2,r.v.length);
// kondisi gerbang hari itu: 1001 scan masuk, 1002 belum, 1003 izin
post({a:'hadir',t:G3,items:[{kode:'1001',metode:'nis',jenis:'Masuk',konf:true},{kode:'1004',metode:'nis',jenis:'Masuk',konf:true}]});
post({a:'izin_simpan',t:A,nis:'1003',jenis:'Sakit',tgl:'2026-11-05'});
r=post({a:'kelas_siswa',t:GU,jenis:'Pilihan',ref:idKimia});T('daftar kelas pilihan + status gerbang per siswa',r.ok&&r.siswa.length===3&&r.siswa.find(s=>s.nis==='1001').g.masuk&&!r.siswa.find(s=>s.nis==='1002').g.masuk&&r.siswa.find(s=>s.nis==='1003').g.izin==='Sakit'&&r.mapel==='Kimia',r.siswa);
r=post({a:'kelas_siswa',t:GU2,jenis:'Pilihan',ref:idKimia});T('guru lain tak boleh membuka kelompok bukan miliknya',!r.ok&&/bukan kelas Anda/.test(r.err),r);
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idKimia,jam:3,mapel:'Kimia',tidak:['1002','1003']});
T('presensi kelas pilihan tersimpan (hadir 1, tidak hadir 2)',r.ok&&r.hadir===1&&r.tidak===2&&r.jumlah===3,r);
T('pencocokan gerbang: yang hadir di kelas & sudah scan gerbang tidak dilaporkan; 1002 (alpa di kelas) belum scan -> tidak masuk "gerbangTidakAda"',r.belumGerbang.length===0&&r.gerbangTidakAda.length===0,[r.belumGerbang,r.gerbangTidakAda]);
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idKimia,jam:3,mapel:'Kimia',tidak:['1001']});
T('simpan ulang sesi yang sama = mengganti (bukan menggandakan); 1001 sudah scan gerbang tetapi tidak ada di kelas -> terdeteksi; 1002 hadir di kelas tapi belum scan gerbang -> terdeteksi',r.ok&&r.diperbarui===true&&r.gerbangTidakAda.length===1&&r.gerbangTidakAda[0].nis==='1001'&&r.belumGerbang.some(s=>s.nis==='1002'),r);
const sesiN=post({a:'kelas_sesi_list',t:GU,dari:'2026-11-05',sampai:'2026-11-05'});T('hanya satu catatan sesi, hitungan terbaru',sesiN.v.length===1&&sesiN.v[0].hadir===2&&sesiN.v[0].tidak===1,sesiN.v);
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idKimia,jam:4,mapel:'Kimia',tidak:['1004']});T('NIS bukan anggota kelompok ditolak',!r.ok&&/bukan anggota/.test(r.err),r);
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idKimia,jam:13,mapel:'Kimia',tidak:[]});T('jam pelajaran di luar 1-12 ditolak',!r.ok,r);
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idKimia,jam:2,mapel:'',tidak:[]});T('mapel dari kelompok dipakai bila kosong (Kimia)',r.ok,r);
r=post({a:'kelas_simpan',t:GU2,jenis:'Reguler',ref:'7A',jam:3,mapel:'Bahasa Indonesia',tidak:[]});T('kelas reguler boleh diisi guru mana pun',r.ok&&r.jumlah>0,r);
r=post({a:'kelas_siswa',t:GU2,jenis:'Reguler',ref:'7A'});T('sesi hari ini muncul untuk diedit (kelas reguler 7A jam 3)',r.sesi.length===1&&r.sesi[0].jam===3&&r.sesi[0].nip==='G200',r.sesi);
r=post({a:'kelas_simpan',t:GU,jenis:'Reguler',ref:'7A',jam:3,mapel:'Matematika',tidak:[]});T('guru lain tak boleh menimpa sesi yang sudah diisi guru lain',!r.ok&&/sudah diisi oleh/.test(r.err),r);
r=post({a:'kelas_simpan',t:A,jenis:'Reguler',ref:'7A',jam:3,mapel:'Bahasa Indonesia',tidak:[]});T('admin boleh mengoreksi sesi guru lain',r.ok&&r.diperbarui===true,r);
r=post({a:'kelas_simpan',t:GU,jenis:'Reguler',ref:'ZZ',jam:1,mapel:'X',tidak:[]});T('kelas tidak ada ditolak',!r.ok,r);
r=post({a:'kelas_simpan',t:G3,jenis:'Reguler',ref:'7A',jam:5,mapel:'Fisika',tidak:[]});T('petugas gerbang tak boleh mengisi presensi kelas',!r.ok&&/ditolak/.test(r.err),r);
r=post({a:'kelas_simpan',t:W,jenis:'Reguler',ref:'7A',jam:5,mapel:'Fisika',tidak:[]});T('wali kelas tak boleh mengisi presensi kelas',!r.ok,r);
NOW=Date.parse('2026-11-07T08:00:00+07:00'); // Sabtu = bukan hari aktif
r=post({a:'kelas_simpan',t:GU,jenis:'Reguler',ref:'7A',jam:1,mapel:'X1',tidak:[]});T('hari tidak aktif ditolak',!r.ok&&/hari aktif/.test(r.err),r);
NOW=Date.parse('2026-11-05T10:00:00+07:00');
// laporan & rekap
r=post({a:'kelas_sesi_list',t:A,dari:'2026-11-05',sampai:'2026-11-05'});T('admin melihat semua sesi hari itu',r.v.length>=3,r.v.length);
r=post({a:'kelas_sesi_list',t:W,dari:'2026-11-05',sampai:'2026-11-05'});T('wali 7A hanya melihat sesi reguler kelasnya',r.ok&&r.v.length===1&&r.v.every(x=>x.ref==='7A'&&x.jenis==='Reguler'),r.v);
r=post({a:'kelas_rekap',t:A,dari:'2026-11-05',sampai:'2026-11-05'});T('rekap tidak hadir per siswa & mapel (1001 alpa Kimia)',r.ok&&r.v.some(x=>x.nis==='1001'&&x.mapel.Kimia===1),r.v);
r=post({a:'kelas_rekap',t:W,dari:'2026-11-05',sampai:'2026-11-05',kelas:'7B'});T('rekap wali dipaksa kelasnya sendiri',r.ok&&r.v.every(x=>x.kelas==='7A'),r.v);
r=post({a:'kelas_rekap',t:GU,dari:'2026-11-05'});T('guru tak boleh membuka rekap sekolah',!r.ok,r);
// kelompok: impor ulang mengganti anggota; status
r=post({a:'kelompok_import',t:A,rows:[['Kimia','Kimia','G100','1002']]});T('impor ulang kelompok: anggota diganti (1 anggota), kelompok lain tidak terganggu',r.ok&&r.baru===0&&r.update===1&&r.anggota===1,r);
r=post({a:'kelompok_list',t:A});T('Kimia 1 anggota, Bahasa Jerman tetap 1',r.v.find(x=>x.Nama==='Kimia').Anggota===1&&r.v.find(x=>x.Nama==='Bahasa Jerman').Anggota===1,r.v);
r=post({a:'kelompok_status',t:A,id:idKimia,status:'Nonaktif'});r=post({a:'kelas_siswa',t:GU,jenis:'Pilihan',ref:idKimia});T('kelompok nonaktif tidak bisa dipakai',!r.ok,r);
// akun guru massal
r=post({a:'guru_akun_massal',t:A});T('akun massal: hanya guru yang belum punya akun (G100,G200 sudah ada)',r.ok&&r.v.every(x=>x.username!=='g100'&&x.username!=='g200'),r);
post({a:'guru_save',t:A,baru:true,v:{NIP:'G300',Nama:'Pak Tiga'}});
r=post({a:'guru_akun_massal',t:A});T('akun massal: guru baru dapat akun + password acak 10 karakter',r.ok&&r.v.length===1&&r.v[0].username==='g300'&&r.v[0].password.length===10,r);
const pw3=r.v[0].password;r=post({a:'login',u:'g300',p:pw3});T('login dengan akun massal berhasil',r.ok&&r.u.peran==='Guru'&&r.u.nip==='G300',r);
r=post({a:'guru_akun_massal',t:GU});T('guru tak boleh membuat akun massal',!r.ok,r);
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- keterangan tidak hadir (tanpa keterangan / sakit / izin) + matriks per kelas ----
NOW=Date.parse('2026-11-10T06:30:00+07:00'); // Selasa
post({a:'hadir',t:G3,items:[{kode:'1001',metode:'nis',jenis:'Masuk',konf:true},{kode:'1002',metode:'nis',jenis:'Masuk',konf:true}]});
r=post({a:'kelompok_import',t:A,rows:[['Fisika','Fisika','G100','1005'],['Fisika','Fisika','G100','2001']]});T('kelompok Fisika (anggota 1005, 2001)',r.ok&&r.baru===1&&r.anggota===2,r);
const idFis=post({a:'kelompok_list',t:GU}).v.find(x=>x.Nama==='Fisika').ID;
r=post({a:'kelas_simpan',t:GU2,jenis:'Reguler',ref:'7A',jam:1,mapel:'Matematika',tidak:{'1001':'Sakit','1002':'Tanpa keterangan','2002':'karangan-bebas'}});
T('simpan dengan keterangan per siswa (nilai tak dikenal -> Tanpa keterangan); 1001 sudah scan gerbang -> terdeteksi beserta keterangannya',r.ok&&r.tidak===3&&r.gerbangTidakAda.some(x=>x.nis==='1001'&&x.ket==='Sakit'),r);
r=post({a:'kelas_siswa',t:GU2,jenis:'Reguler',ref:'7A'});T('membuka sesi lagi: keterangan tersimpan (objek NIS -> keterangan)',r.sesi[0].tidak['1001']==='Sakit'&&r.sesi[0].tidak['1002']==='Tanpa keterangan'&&r.sesi[0].tidak['2002']==='Tanpa keterangan',r.sesi[0]);
r=post({a:'kelas_simpan',t:GU,jenis:'Reguler',ref:'7A',jam:2,mapel:'Bahasa Indonesia',tidak:{}});
r=post({a:'kelas_simpan',t:GU,jenis:'Pilihan',ref:idFis,jam:3,mapel:'Fisika',tidak:{'2001':'Izin'}});T('presensi kelas pilihan Fisika jam 3',r.ok&&r.jumlah===2&&r.tidak===1,r);
r=post({a:'kelas_matriks',t:A,kelas:'7A',tgl:'2026-11-10'});
const c1=r.v.find(x=>x.nis==='1001'),c2=r.v.find(x=>x.nis==='1002'),c5=r.v.find(x=>x.nis==='1005'),c20=r.v.find(x=>x.nis==='2001'),c22=r.v.find(x=>x.nis==='2002');
T('matriks: minimal 9 kolom jam, header jam 1 memuat mapel dan guru',r.ok&&r.jam.length>=9&&/Matematika/.test(r.jam[0].info),r.jam.slice(0,3));
T('matriks jam 1: 1001=S, 1002=T, 2002=T, 1005=h (hadir)',c1.c[1]==='S'&&c2.c[1]==='T'&&c22.c[1]==='T'&&c5.c[1]==='h',[c1.c[1],c2.c[1],c22.c[1],c5.c[1]]);
T('matriks jam 2 (Bahasa Indonesia, semua hadir): semua h',r.v.every(x=>x.c[2]==='h'),r.v.map(x=>x.c[2]));
T('matriks jam 3 (kelas pilihan Fisika): anggota 1005=h, 2001=I; non-anggota kosong',c5.c[3]==='h'&&c20.c[3]==='I'&&c1.c[3]==='',[c5.c[3],c20.c[3],c1.c[3]]);
T('matriks jam 4 (tidak ada sesi): kosong untuk semua',r.v.every(x=>x.c[4]===''),r.v.map(x=>x.c[4]));
T('matriks diurutkan menurut nama',r.v.every((x,i,a)=>!i||a[i-1].nama.localeCompare(x.nama)<=0),r.v.map(x=>x.nama));
r=post({a:'kelas_matriks',t:W,kelas:'7B',tgl:'2026-11-10'});T('wali meminta 7B tetap dipaksa 7A',r.ok&&r.kelas==='7A',r.kelas);
r=post({a:'kelas_matriks',t:G3,kelas:'7A',tgl:'2026-11-10'});T('petugas tak boleh membuka matriks',!r.ok,r);
r=post({a:'kelas_matriks',t:GU,kelas:'7A',tgl:'2026-11-10'});T('guru tak boleh membuka matriks (hanya admin dan wali)',!r.ok,r);
r=post({a:'kelas_rekap',t:A,dari:'2026-11-10',sampai:'2026-11-10'});const rk=r.v.find(x=>x.nis==='1001');T('rekap memuat hitungan per keterangan (1001: Sakit 1)',rk.ket.Sakit===1&&rk.total===1,rk);
// koreksi: ganti keterangan dengan menyimpan ulang sesi yang sama
r=post({a:'kelas_simpan',t:GU2,jenis:'Reguler',ref:'7A',jam:1,mapel:'Matematika',tidak:{'1001':'Izin'}});
r=post({a:'kelas_matriks',t:A,kelas:'7A',tgl:'2026-11-10'});T('simpan ulang mengganti keterangan lama (1001=I, 1002 sekarang h)',r.v.find(x=>x.nis==='1001').c[1]==='I'&&r.v.find(x=>x.nis==='1002').c[1]==='h',r.v.slice(0,3).map(x=>x.c[1]));
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- peran BK, password sederhana, akun wali massal, pembatasan akses ----
NOW=Date.parse('2026-11-10T10:00:00+07:00'); // Selasa (hari aktif)
r=post({a:'petugas_save',t:A,v:{Username:'adminlemah',Nama:'X',Peran:'Admin',Password:'abc1234',Status:'Aktif'}});T('password Admin 7 karakter ditolak (minimal 8)',!r.ok&&/minimal 8/.test(r.err),r);
r=post({a:'petugas_save',t:A,v:{Username:'bkpendek',Nama:'X',Peran:'BK',Password:'abc12',Status:'Aktif'}});T('password BK 5 karakter ditolak (minimal 6)',!r.ok&&/minimal 6/.test(r.err),r);
r=post({a:'petugas_save',t:A,v:{Username:'bk1',Nama:'Ibu BK',Peran:'BK',Password:'bk1234',Status:'Aktif'}});T('akun BK dengan password sederhana (6 karakter) diterima',r.ok,r);
r=post({a:'login',u:'bk1',p:'bk1234'});const BK=r.t;T('login BK: peran BK',r.ok&&r.u.peran==='BK'&&r.u.kelas==='',r.u);
r=post({a:'dashboard',t:BK});T('BK: dashboard seluruh sekolah (lebih dari satu kelas)',r.ok&&r.v.kelas.length>=2,r.v&&r.v.kelas.length);
r=post({a:'laporan',t:BK,dari:'2026-11-02',sampai:'2026-11-02',kelas:'7B'});T('BK: laporan kelas mana pun (7B), hanya siswa',r.ok&&r.v.length>0&&r.v.every(x=>x.Kelas==='7B'&&x.Tipe==='Siswa'),r.v&&r.v.map(x=>x.Kelas));
r=post({a:'laporan',t:BK,dari:'2026-11-02',sampai:'2026-11-02',tipe:'Guru'});T('BK: permintaan data guru dipaksa menjadi siswa',r.ok&&r.v.every(x=>x.Tipe==='Siswa'),r.v&&r.v.map(x=>x.Tipe));
r=post({a:'rekap',t:BK,bulan:'2026-11',kelas:'Guru'});T('BK: rekap data guru ditolak',!r.ok,r);
r=post({a:'rekap',t:BK,bulan:'2026-11',kelas:'7A'});T('BK: rekap bulanan per kelas (7A)',r.ok&&r.v.length>0&&r.v.every(x=>x.kelas==='7A'),r.v&&r.v.length);
r=post({a:'kelas_matriks',t:BK,kelas:'7A',tgl:'2026-11-10'});T('BK: tabel jam pelajaran kelas mana pun',r.ok&&r.kelas==='7A',r);
r=post({a:'kelas_rekap',t:BK,dari:'2026-11-10',sampai:'2026-11-10'});T('BK: rekap ketidakhadiran di kelas, semua kelas',r.ok&&r.v.length>0,r.v&&r.v.length);
r=post({a:'kelas_sesi_list',t:BK,dari:'2026-11-10',sampai:'2026-11-10'});T('BK: daftar sesi semua kelas',r.ok&&r.v.length>=3,r.v&&r.v.length);
r=post({a:'siswa_kelas',t:BK,kelas:'7B'});T('BK: daftar siswa kelas mana pun (untuk izin/sakit)',r.ok&&r.kelas==='7B'&&r.v.length>0,r);
r=post({a:'izin_simpan',t:BK,nis:'1003',jenis:'Sakit',tgl:'2026-11-11'});T('BK: mencatat sakit siswa kelas mana pun',r.ok,r);
r=post({a:'belum_hadir',t:BK});T('BK: daftar belum presensi tanpa kunci password, semua kelas',r.ok&&new Set(r.v.map(x=>x.kelas)).size>=1,r.v&&r.v.length);
r=post({a:'presensi_koreksi',t:BK,id:'x',alasan:'tes'});T('BK tak boleh membatalkan presensi',!r.ok,r);
r=post({a:'presensi_manual',t:BK,nis:'1001',tgl:'2026-11-10',jam:'07:00',jenis:'Masuk',alasan:'tes'});T('BK tak boleh presensi manual',!r.ok,r);
r=post({a:'notif_siapkan',t:BK});T('BK tak boleh mengelola notifikasi',!r.ok,r);
r=post({a:'petugas_list',t:BK});T('BK tak boleh melihat daftar akun',!r.ok,r);
r=post({a:'pengaturan_set',t:BK,v:{semester:'Genap'}});T('BK tak boleh mengubah pengaturan',!r.ok,r);
r=post({a:'bio_data',t:BK});T('BK tak boleh mengunduh data wajah',!r.ok,r);
r=post({a:'kelas_simpan',t:BK,jenis:'Reguler',ref:'7A',jam:5,mapel:'Tes',tidak:{}});T('BK tak boleh mengisi presensi kelas',!r.ok,r);
// guru dibatasi dari data gerbang
r=post({a:'presensi_data',t:GU});T('guru tak boleh mengunduh data siswa gerbang',!r.ok&&/ditolak/.test(r.err),r);
r=post({a:'hadir',t:GU,items:[{kode:'1001',metode:'barcode'}]});T('guru tak boleh mencatat presensi gerbang',!r.ok&&/ditolak/.test(r.err),r);
r=post({a:'bio_data',t:GU});T('guru tak boleh mengunduh data wajah',!r.ok,r);
// akun wali massal + password sederhana
r=post({a:'wali_akun_massal',t:GU});T('guru tak boleh membuat akun wali massal',!r.ok,r);
r=post({a:'wali_akun_massal',t:A});T('akun wali massal: 7B dibuat (wali7b), 7A dilewati karena sudah punya wali',r.ok&&r.v.some(x=>x.username==='wali7b'&&x.password==='wali7b'&&x.kelas==='7B')&&!r.v.some(x=>x.kelas==='7A'),r);
r=post({a:'login',u:'wali7b',p:'wali7b'});const W7B=r.t;T('login wali massal (user wali7b / pass wali7b), terikat kelas 7B',r.ok&&r.u.peran==='Wali'&&r.u.kelas==='7B',r);
r=post({a:'login',u:'WALI7B',p:'wali7b'});T('username tidak membedakan huruf besar/kecil (WaliX1 = walix1)',r.ok,r);
r=post({a:'login',u:'wali7b',p:'WALI7B'});T('password membedakan huruf besar/kecil',!r.ok,r);
r=post({a:'dashboard',t:W7B});T('wali massal: dashboard hanya kelasnya (7B)',r.ok&&r.v.kelas.length===1&&r.v.kelas[0].nama==='7B',r.v&&r.v.kelas);
r=post({a:'wali_akun_massal',t:A});T('akun wali massal kedua kali: tidak ada akun baru',r.ok&&r.v.length===0,r);
r=post({a:'ganti_password',t:W7B,lama:'wali7b',baru:'abc12'});T('ganti password wali: 5 karakter ditolak',!r.ok&&/minimal 6/.test(r.err),r);
r=post({a:'ganti_password',t:W7B,lama:'wali7b',baru:'walix1'});T('ganti password wali menjadi walix1 (6 karakter) diterima',r.ok,r);
r=post({a:'login',u:'wali7b',p:'walix1'});T('login dengan password baru berhasil',r.ok,r);
r=post({a:'ganti_password',t:A,lama:'passwordbaru1',baru:'abc1234'});T('ganti password Admin: 7 karakter ditolak (minimal 8)',!r.ok&&/minimal 8/.test(r.err),r);
NOW=Date.parse('2026-11-02T10:00:00+07:00');


// ---- RFID ----
NOW=Date.parse('2026-11-12T06:40:00+07:00'); // Kamis
r=post({a:'rfid_set',t:A,id:'1001',uid:'0012ab34cd'});T('daftarkan kartu RFID: kode diseragamkan (huruf besar, tanpa nol di depan)',r.ok&&r.rfid==='12AB34CD',r);
r=post({a:'rfid_set',t:A,id:'1002',uid:'12AB34CD'});T('kartu yang sama tidak boleh dipakai dua siswa',!r.ok&&/sudah terdaftar atas nama/.test(r.err),r);
r=post({a:'rfid_set',t:A,id:'1002',uid:'00012ab34cd'});T('bentrok tetap terdeteksi walau beda nol di depan/huruf kecil',!r.ok,r);
r=post({a:'rfid_set',t:A,id:'1003',uid:'1002'});T('kode yang sama dengan NIS orang lain ditolak',!r.ok&&/sama dengan NIS/.test(r.err),r);
r=post({a:'rfid_set',t:A,id:'1003',uid:'ab'});T('kode terlalu pendek ditolak',!r.ok&&/tidak valid/.test(r.err),r);
r=post({a:'rfid_set',t:A,id:'1001',uid:'12AB34CD'});T('pemilik boleh mendaftarkan ulang kartunya sendiri',r.ok,r);
r=post({a:'rfid_set',t:A,id:'ZZZ',uid:'AAAA9999'});T('NIS tidak ditemukan ditolak',!r.ok,r);
r=post({a:'rfid_set',t:A,id:'1002',uid:'9988776655'});T('kartu siswa kedua (1002)',r.ok,r);
r=post({a:'rfid_set',t:A,id:'G100',uid:'GURU1001'});T('kartu RFID untuk guru',r.ok,r);
r=post({a:'rfid_set',t:G3,id:'1003',uid:'CCCC0001'});T('petugas tak boleh mendaftarkan kartu',!r.ok,r);
r=post({a:'rfid_set',t:GU,id:'1003',uid:'CCCC0001'});T('guru tak boleh mendaftarkan kartu',!r.ok,r);
r=post({a:'rfid_list',t:A,kelas:'7A'});T('daftar status kartu kelas 7A memuat 1001 dengan kodenya',r.ok&&r.v.find(x=>x.id==='1001').rfid==='12AB34CD',r.v&&r.v.slice(0,2));
r=post({a:'presensi_data',t:G3});T('data sinkron ke perangkat presensi memuat kode RFID ternormalisasi',r.orang.find(x=>x.nis==='1001').rfid==='12AB34CD'&&r.orang.find(x=>x.nis==='G100').rfid==='GURU1001',r.orang.find(x=>x.nis==='1001'));
// presensi dengan kartu (metode RFID belum diaktifkan di pengaturan)
r=post({a:'hadir',t:G3,items:[{kode:'12ab34cd',metode:'barcode'}]});T('RFID belum diaktifkan di Pengaturan: ditolak jelas',r.res[0].err&&/rfid tidak diaktifkan/.test(r.res[0].err),r);
post({a:'pengaturan_set',t:A,v:{metode_aktif:'barcode,rfid,qr,nis,wajah,sidik'}});
r=post({a:'hadir',t:G3,items:[{kode:'12ab34cd',metode:'barcode'}]});const br1=sheets.PRESENSI.d.slice(-1)[0];
T('tempel kartu RFID: presensi tercatat atas nama pemilik, metode = rfid',r.res[0].ok&&r.res[0].nama==='Budi'&&br1[8]==='rfid',[r.res[0],br1]);
r=post({a:'hadir',t:G3,items:[{kode:'000000009988776655',metode:'barcode'}]});T('pembaca yang menambah nol di depan tetap dikenali (1002)',r.res[0].ok&&r.res[0].nama==='Ani',r);
r=post({a:'hadir',t:G3,items:[{kode:'12AB34CD',metode:'barcode'}]});T('kartu yang sama dua kali: terdeteksi sudah presensi (tidak ganda)',r.res[0].dup===1,r);
r=post({a:'hadir',t:G3,items:[{kode:'FFFF0000',metode:'barcode'}]});T('kartu RFID belum terdaftar: Tidak dikenali',r.res[0].err==='Tidak dikenali',r);
r=post({a:'hadir',t:G3,items:[{kode:'GURU1001',metode:'barcode'}]});T('kartu RFID guru tercatat sebagai guru',r.res[0].ok&&r.res[0].nama==='Pak Guru',r);
r=post({a:'hadir',t:G3,items:[{kode:'12AB34CD',metode:'qr'}]});T('kode RFID yang dikirim sebagai QR tidak dicocokkan lewat RFID (jalur RFID hanya dari pemindai kartu)',r.res[0].err==='Tidak dikenali',r);
// simpan lewat form siswa/guru
r=post({a:'siswa_save',t:A,baru:false,v:{NIS:'1003',Nama:'Citra',ID_Kelas:'7B',Status:'Aktif',Kode_RFID:'abcd1234'}});T('form siswa: kode RFID tersimpan',r.ok&&post({a:'rfid_list',t:A,kelas:'7B'}).v.find(x=>x.id==='1003').rfid==='ABCD1234',r);
r=post({a:'siswa_save',t:A,baru:false,v:{NIS:'1004',Nama:'Dewi',ID_Kelas:'7B',Status:'Aktif',Kode_RFID:'0abcd1234'}});T('form siswa: kode RFID milik orang lain ditolak',!r.ok&&/sudah terdaftar/.test(r.err),r);
r=post({a:'siswa_save',t:A,baru:false,v:{NIS:'1003',Nama:'Citra',ID_Kelas:'7B',Status:'Aktif'}});T('menyimpan siswa tanpa menyentuh kolom RFID tidak menghapus kartunya',post({a:'rfid_list',t:A,kelas:'7B'}).v.find(x=>x.id==='1003').rfid==='ABCD1234');
r=post({a:'siswa_save',t:A,baru:false,v:{NIS:'1003',Nama:'Citra',ID_Kelas:'7B',Status:'Aktif',Kode_RFID:''}});T('mengosongkan kolom RFID di form melepas kartu',post({a:'rfid_list',t:A,kelas:'7B'}).v.find(x=>x.id==='1003').rfid==='');
r=post({a:'guru_save',t:A,baru:false,v:{NIP:'G200',Nama:'Bu Guru Dua',Kode_RFID:'GURU2002'}});T('form guru: kode RFID tersimpan',r.ok&&post({a:'rfid_list',t:A,kelas:'Guru'}).v.find(x=>x.id==='G200').rfid==='GURU2002',r);
// impor massal
r=post({a:'rfid_import',t:A,rows:[['1004','AAAA1111'],['1005','aaaa1111'],['9999X','BBBB2222'],['1006','0000CCCC3333'],['1001','12AB34CD']]});
T('impor massal: 3 tersimpan (1004, 1006, 1001 kartu sendiri); duplikat dalam berkas dan NIS tak ada dilaporkan per baris',r.ok&&r.tersimpan===3&&r.err.length===2&&/Baris 2/.test(r.err[0])&&/Baris 3/.test(r.err[1]),r);
r=post({a:'rfid_list',t:A,kelas:'7A'});T('hasil impor terbaca di daftar (1006 = CCCC3333, nol di depan dibuang)',r.v.find(x=>x.id==='1006').rfid==='CCCC3333'&&r.v.find(x=>x.id==='1001').rfid==='12AB34CD',r.v.map(x=>x.id+':'+x.rfid));
r=post({a:'rfid_import',t:GU,rows:[['1004','DDDD4444']]});T('guru tak boleh impor kartu',!r.ok,r);
r=post({a:'rfid_hapus',t:A,id:'1004'});T('hapus kartu siswa',r.ok&&post({a:'rfid_list',t:A,kelas:'7B'}).v.find(x=>x.id==='1004').rfid==='',r);
NOW=Date.parse('2026-11-02T10:00:00+07:00');

// uji beban
NOW=Date.parse('2026-11-03T06:40:00+07:00');
const n0=sheets.PRESENSI.d.length;ctx.__uji();T('ujiBeban menghapus baris uji',sheets.PRESENSI.d.length===n0,[n0,sheets.PRESENSI.d.length]);
console.log(`\nHASIL: ${ok} lulus, ${bad} gagal`);
})();

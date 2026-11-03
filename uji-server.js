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
  clearContent(){}}}};
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
vm.runInContext(['Code.gs','Presensi.gs','Biometrik.gs','Perangkat.gs','Laporan.gs','Operasional.gs','Notifikasi.gs'].map(f=>fs.readFileSync(D+f,'utf8')).join('\n')+'\nthis.__doPost=doPost;this.__setup=setupAwal;this.__uji=ujiBeban;',ctx);
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
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'},{kode:'BC-1002',metode:'barcode'},{kode:'G100',metode:'nis'},{kode:'0000',metode:'nis'}]});
T('hadir tepat waktu (NIS & kode barcode, guru, tak dikenal)',r.res[0].status==='Tepat waktu'&&r.res[1].ok&&r.res[2].ok&&r.res[3].err==='Tidak dikenali',r);
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'}]});T('presensi ganda terdeteksi',r.res[0].dup===1,r);
r=post({a:'hadir',t:G,items:[{kode:'1001',metode:'barcode'},{kode:'1001',metode:'nis'}]});T('ganda dalam satu batch',r.res[0].dup&&r.res[1].dup,r);
NOW=Date.parse('2026-11-02T07:20:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1003',metode:'nis'}]});T('terlambat + email ortu tidak ada',r.res[0].status==='Terlambat',r);
NOW=Date.parse('2026-11-02T08:30:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1003',metode:'nis',jenis:'Pulang'}]});T('pulang (jenis eksplisit) setelah tutup dicatat',r.res[0].ok&&r.res[0].jenis==='Pulang',r);
NOW=Date.parse('2026-11-02T06:50:00+07:00');
post({a:'pengaturan_set',t:A,v:{metode_aktif:'nis'}});
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'wajah'}]});T('metode tidak aktif ditolak',r.res[0].err&&/tidak diaktifkan/.test(r.res[0].err),r);
post({a:'pengaturan_set',t:A,v:{metode_aktif:'barcode,qr,nis,wajah,sidik'}});
// waktu antrean: ts di masa depan harus diabaikan
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'nis',jenis:'Pulang',ts:Date.parse('2026-11-02T20:00:00+07:00'),q:1}]});
const bar=ctx.__doPost&&sheets.PRESENSI.d.slice(-1)[0];T('ts masa depan dari antrean diabaikan (pakai jam server 06:50)',bar[2].startsWith('06:50'),bar);
// hari tidak aktif
NOW=Date.parse('2026-11-01T07:00:00+07:00');
r=post({a:'hadir',t:G,items:[{kode:'1002',metode:'nis'}]});T('Minggu = bukan hari aktif',/hari aktif/.test(r.res[0].err),r);
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
r=post({a:'hadir',t:G,items:[{kode:'1005',metode:'nis'}]});T('1005 terlambat tercatat',r.res[0].status==='Terlambat',r);
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
post({a:'hadir',t:G,items:[{kode:'1007',metode:'nis'}]});
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
// uji beban
NOW=Date.parse('2026-11-03T06:40:00+07:00');
const n0=sheets.PRESENSI.d.length;ctx.__uji();T('ujiBeban menghapus baris uji',sheets.PRESENSI.d.length===n0,[n0,sheets.PRESENSI.d.length]);
console.log(`\nHASIL: ${ok} lulus, ${bad} gagal`);
})();

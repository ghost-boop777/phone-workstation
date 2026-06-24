/* ═══════════════════════════════════════════════════════════════════════
   Web Worker — parses one CSV / TXT / XLSX file OFF the main thread so the
   UI never freezes on big files. Posts progress, then the parsed rows.
   ═══════════════════════════════════════════════════════════════════════ */
/* global Papa, XLSX */
importScripts(
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
);

// Clamp an inflated sheet dimension (e.g. A1:Z1048576) to the real data extent,
// otherwise sheet_to_json builds ~1,000,000 empty rows.
function trimSheetRange(ws){
  if(!ws || !ws['!ref']) return;
  const dec=XLSX.utils.decode_range(ws['!ref']);
  if((dec.e.r - dec.s.r) < 20000) return;
  let maxR=0, maxC=0, seen=false;
  for(const k in ws){
    if(k.charCodeAt(0)===33) continue;             // skip '!ref', '!cols', …
    const cell=XLSX.utils.decode_cell(k);
    seen=true;
    if(cell.r>maxR) maxR=cell.r;
    if(cell.c>maxC) maxC=cell.c;
  }
  ws['!ref']= seen ? XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:maxR,c:maxC}}) : 'A1';
}

self.onmessage = async (e) => {
  const { file } = e.data || {};
  if(!file){ self.postMessage({type:'error', message:'no file'}); return; }
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  try{
    let rows;
    if(ext==='csv' || ext==='txt'){
      rows = await new Promise((res, rej)=>{
        const out=[];
        Papa.parse(file, {
          header:true, skipEmptyLines:true,
          chunk: results => { for(let i=0;i<results.data.length;i++) out.push(results.data[i]);
                              self.postMessage({type:'progress', name:file.name, count:out.length}); },
          complete: ()=>res(out),
          error: rej,
        });
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array', cellStyles:false, cellNF:false, cellFormula:false, cellHTML:false, cellDates:false});
      rows=[];
      for(const n of wb.SheetNames){
        const ws=wb.Sheets[n];
        trimSheetRange(ws);
        const part=XLSX.utils.sheet_to_json(ws, {defval:'', blankrows:false});
        for(let i=0;i<part.length;i++) rows.push(part[i]);
        self.postMessage({type:'progress', name:file.name, count:rows.length});
      }
    }
    self.postMessage({type:'done', name:file.name, rows});
  }catch(err){
    self.postMessage({type:'error', name:file.name, message:String((err && err.message) || err)});
  }
};

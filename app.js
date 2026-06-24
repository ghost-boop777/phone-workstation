/* ═══════════════════════════════════════════════════════════════════════
   UK Phone Validation Workstation
   Folder/Excel ingest → validate → classify line-type → dedup → live-check
   ═══════════════════════════════════════════════════════════════════════ */
'use strict';

const BUILD = '2026-06-24c';
console.log('Phone Workstation build', BUILD, '— + Web Worker parsing + chunked validation');

const state = {
  files: [], rawRecords: [], records: [], tab: 'landline', query: '',
  sortCol: null, sortDir: 'asc', page: 1, pageSize: 100, step: 1,
};

const PHONE_VARIANTS = ['phone','mobile','cell','telephone','tel','number','phone_number',
  'mobile_number','contact','msisdn','phonenumber','landline','telephonenumber','tel_no','telno'];

const $ = id => document.getElementById(id);

// ── UK area code → town/region (built-in, free, no download) ──────────────
// Keyed by national-prefix digits (no leading 0). Matched longest-first.
const UK_AREAS = {
  '20':'London','23':'Southampton/Portsmouth','24':'Coventry','28':'Northern Ireland','29':'Cardiff',
  '113':'Leeds','114':'Sheffield','115':'Nottingham','116':'Leicester','117':'Bristol','118':'Reading',
  '121':'Birmingham','131':'Edinburgh','141':'Glasgow','151':'Liverpool','161':'Manchester','191':'Tyne & Wear',
  '1204':'Bolton','1206':'Colchester','1224':'Aberdeen','1223':'Cambridge','1225':'Bath','1226':'Barnsley',
  '1227':'Canterbury','1233':'Ashford','1234':'Bedford','1235':'Abingdon','1236':'Coatbridge','1241':'Arbroath',
  '1242':'Cheltenham','1243':'Chichester','1244':'Chester','1245':'Chelmsford','1246':'Chesterfield','1248':'Bangor',
  '1249':'Chippenham','1252':'Aldershot','1253':'Blackpool','1254':'Blackburn','1255':'Clacton','1256':'Basingstoke',
  '1257':'Coppull','1258':'Blandford','1259':'Alloa','1260':'Congleton','1261':'Banff','1262':'Bridlington',
  '1263':'Cromer','1264':'Andover','1267':'Carmarthen','1268':'Basildon','1269':'Ammanford','1270':'Crewe',
  '1271':'Barnstaple','1273':'Brighton','1274':'Bradford','1275':'Clevedon','1276':'Camberley','1277':'Brentwood',
  '1278':'Bridgwater','1279':'Bishops Stortford','1280':'Buckingham','1283':'Burton-on-Trent','1284':'Bury St Edmunds',
  '1286':'Caernarfon','1287':'Guisborough','1288':'Bude','1289':'Berwick','1290':'Cumnock','1291':'Chepstow',
  '1292':'Ayr','1293':'Crawley','1294':'Ardrossan','1295':'Banbury','1296':'Aylesbury','1297':'Axminster',
  '1298':'Buxton','1299':'Bewdley','1302':'Doncaster','1303':'Folkestone','1304':'Dover','1305':'Dorchester',
  '1306':'Dorking','1307':'Forfar','1308':'Bridport','1309':'Forres','1322':'Dartford','1323':'Eastbourne',
  '1324':'Falkirk','1325':'Darlington','1326':'Falmouth','1327':'Daventry','1328':'Fakenham','1329':'Fareham',
  '1330':'Banchory','1332':'Derby','1333':'Peat Inn','1334':'St Andrews','1335':'Ashbourne','1337':'Cupar',
  '1339':'Aboyne','1340':'Craigellachie','1341':'Barmouth','1342':'East Grinstead','1343':'Elgin','1344':'Bracknell',
  '1346':'Fraserburgh','1347':'Easingwold','1348':'Fishguard','1349':'Dingwall','1350':'Dunkeld','1352':'Mold',
  '1353':'Ely','1354':'Chatteris','1355':'East Kilbride','1356':'Brechin','1357':'Strathaven','1358':'Ellon',
  '1359':'Pakenham','1360':'Killearn','1361':'Duns','1362':'Dereham','1363':'Crediton','1364':'Ashburton',
  '1366':'Downham Market','1367':'Faringdon','1368':'Dunbar','1369':'Dunoon','1371':'Great Dunmow','1372':'Esher',
  '1373':'Frome','1375':'Grays Thurrock','1376':'Braintree','1377':'Driffield','1379':'Diss','1380':'Devizes',
  '1381':'Fortrose','1382':'Dundee','1386':'Evesham','1387':'Dumfries','1388':'Bishop Auckland','1389':'Dumbarton',
  '1392':'Exeter','1394':'Felixstowe','1395':'Budleigh Salterton','1397':'Fort William','1398':'Dulverton',
  '1404':'Honiton','1405':'Goole','1406':'Holbeach','1407':'Holyhead','1408':'Golspie','1409':'Holsworthy',
  '1420':'Alton','1422':'Halifax','1423':'Harrogate','1424':'Hastings','1425':'Ringwood','1426':'Hayle',
  '1427':'Gainsborough','1428':'Haslemere','1429':'Hartlepool','1430':'Howden','1431':'Helmsdale','1432':'Hereford',
  '1433':'Hathersage','1434':'Hexham','1435':'Heathfield','1436':'Helensburgh','1437':'Haverfordwest','1438':'Stevenage',
  '1439':'Helmsley','1440':'Haverhill','1442':'Hemel Hempstead','1443':'Pontypridd','1444':'Haywards Heath',
  '1445':'Gairloch','1446':'Barry','1449':'Stowmarket','1450':'Hawick','1451':'Stow-on-the-Wold','1452':'Gloucester',
  '1453':'Dursley','1454':'Chipping Sodbury','1455':'Hinckley','1456':'Glenurquhart','1457':'Glossop','1458':'Glastonbury',
  '1460':'Chard','1461':'Gretna','1462':'Hitchin','1463':'Inverness','1464':'Insch','1465':'Girvan','1466':'Huntly',
  '1467':'Inverurie','1469':'Killingholme','1470':'Isle of Skye','1471':'Broadford','1472':'Grimsby','1473':'Ipswich',
  '1474':'Gravesend','1475':'Greenock','1476':'Grantham','1477':'Holmes Chapel','1478':'Portree','1479':'Aviemore',
  '1480':'Huntingdon','1481':'Guernsey','1482':'Hull','1483':'Guildford','1485':'Hunstanton','1487':'Warboys',
  '1488':'Hungerford','1489':'Bishops Waltham','1490':'Corwen','1491':'Henley-on-Thames','1492':'Colwyn Bay',
  '1493':'Great Yarmouth','1494':'High Wycombe','1495':'Pontypool','1496':'Port Ellen','1497':'Hay-on-Wye',
  '1499':'Inveraray','1501':'Harthill','1502':'Lowestoft','1503':'Looe','1505':'Johnstone','1506':'Bathgate',
  '1507':'Louth','1508':'Brooke','1509':'Loughborough','1510':'Llanelli','1520':'Lochcarron','1522':'Lincoln',
  '1524':'Lancaster','1525':'Leighton Buzzard','1526':'Martin','1527':'Redditch','1528':'Laggan','1529':'Sleaford',
  '1530':'Coalville','1531':'Ledbury','1534':'Jersey','1535':'Keighley','1536':'Kettering','1538':'Ipstones',
  '1539':'Kendal','1540':'Kingussie','1542':'Keith','1543':'Cannock','1544':'Kington','1545':'Llanarth',
  '1546':'Lochgilphead','1547':'Knighton','1548':'Kingsbridge','1549':'Lairg','1550':'Llandovery','1553':'Kings Lynn',
  '1554':'Llanelli','1555':'Lanark','1556':'Castle Douglas','1557':'Kirkcudbright','1558':'Llandeilo','1559':'Llandysul',
  '1560':'Moscow','1561':'Laurencekirk','1562':'Kidderminster','1563':'Kilmarnock','1564':'Lapworth','1565':'Knutsford',
  '1566':'Launceston','1567':'Killin','1568':'Leominster','1569':'Stonehaven','1570':'Lampeter','1571':'Lochinver',
  '1572':'Oakham','1573':'Kelso','1575':'Kirriemuir','1576':'Lockerbie','1577':'Kinross','1578':'Lauder',
  '1579':'Liskeard','1580':'Cranbrook','1581':'New Luce','1582':'Luton','1583':'Carradale','1584':'Ludlow',
  '1586':'Campbeltown','1588':'Bishops Castle','1590':'Lymington','1591':'Llanwrtyd Wells','1592':'Kirkcaldy',
  '1593':'Lybster','1594':'Lydney','1595':'Lerwick','1597':'Llandrindod Wells','1598':'Lynton','1599':'Kyle',
  '1600':'Monmouth','1603':'Norwich','1604':'Northampton','1606':'Northwich','1608':'Chipping Norton','1609':'Northallerton',
  '1620':'North Berwick','1621':'Maldon','1622':'Maidstone','1623':'Mansfield','1624':'Isle of Man','1625':'Macclesfield',
  '1626':'Newton Abbot','1628':'Maidenhead','1629':'Matlock','1630':'Market Drayton','1631':'Oban','1633':'Newport',
  '1634':'Medway','1635':'Newbury','1636':'Newark','1637':'Newquay','1638':'Newmarket','1639':'Neath','1641':'Strathy',
  '1642':'Middlesbrough','1643':'Minehead','1644':'New Galloway','1646':'Milford Haven','1647':'Moretonhampstead',
  '1650':'Cemmaes Road','1651':'Oldmeldrum','1652':'Brigg','1653':'Malton','1654':'Machynlleth','1655':'Maybole',
  '1656':'Bridgend','1659':'Sanquhar','1661':'Prudhoe','1663':'New Mills','1664':'Melton Mowbray','1665':'Alnwick',
  '1666':'Malmesbury','1667':'Nairn','1668':'Bamburgh','1669':'Rothbury','1670':'Morpeth','1671':'Newton Stewart',
  '1672':'Marlborough','1673':'Market Rasen','1674':'Montrose','1675':'Coleshill','1676':'Meriden','1677':'Bedale',
  '1678':'Bala','1680':'Isle of Mull','1681':'Isle of Mull','1683':'Moffat','1684':'Malvern','1685':'Merthyr Tydfil',
  '1686':'Newtown','1687':'Mallaig','1688':'Isle of Mull','1689':'Orpington','1690':'Betws-y-Coed','1691':'Oswestry',
  '1692':'North Walsham','1694':'Church Stretton','1695':'Skelmersdale','1697':'Brampton','1698':'Motherwell','1700':'Rothesay',
  '1702':'Southend-on-Sea','1704':'Southport','1706':'Rochdale','1707':'Welwyn','1708':'Romford','1709':'Rotherham',
  '1720':'Isles of Scilly','1721':'Peebles','1722':'Salisbury','1723':'Scarborough','1724':'Scunthorpe','1725':'Rockbourne',
  '1726':'St Austell','1727':'St Albans','1728':'Saxmundham','1729':'Settle','1730':'Petersfield','1732':'Sevenoaks',
  '1733':'Peterborough','1736':'Penzance','1737':'Redhill','1738':'Perth','1740':'Sedgefield','1743':'Shrewsbury',
  '1744':'St Helens','1745':'Rhyl','1746':'Bridgnorth','1747':'Shaftesbury','1748':'Richmond','1749':'Shepton Mallet',
  '1750':'Selkirk','1751':'Pickering','1752':'Plymouth','1753':'Slough','1754':'Skegness','1756':'Skipton',
  '1757':'Selby','1758':'Pwllheli','1759':'Pocklington','1760':'Swaffham','1761':'Temple Cloud','1763':'Royston',
  '1764':'Crieff','1765':'Ripon','1766':'Porthmadog','1767':'Sandy','1768':'Penrith','1769':'South Molton',
  '1770':'Isle of Arran','1772':'Preston','1773':'Ripley','1775':'Spalding','1776':'Stranraer','1777':'Retford',
  '1778':'Bourne','1779':'Peterhead','1780':'Stamford','1782':'Stoke-on-Trent','1784':'Staines','1785':'Stafford',
  '1786':'Stirling','1787':'Sudbury','1788':'Rugby','1789':'Stratford-upon-Avon','1790':'Spilsby','1792':'Swansea',
  '1793':'Swindon','1794':'Romsey','1795':'Sittingbourne','1796':'Pitlochry','1797':'Rye','1798':'Pulborough',
  '1799':'Saffron Walden','1803':'Torquay','1804':'York','1805':'Torrington','1806':'Shetland','1807':'Ballindalloch',
  '1808':'Tomatin','1809':'Invergarry','1822':'Tavistock','1823':'Taunton','1824':'Ruthin','1825':'Uckfield',
  '1827':'Tamworth','1828':'Coupar Angus','1829':'Tarporley','1830':'Kirkwhelpington','1832':'Clopton','1833':'Barnard Castle',
  '1834':'Narberth','1835':'St Boswells','1837':'Okehampton','1838':'Dalmally','1840':'Camelford','1841':'Padstow',
  '1842':'Thetford','1843':'Thanet','1844':'Thame','1845':'Thirsk','1847':'Thurso','1848':'Thornhill','1851':'Stornoway',
  '1852':'Kilmelford','1854':'Ullapool','1856':'Orkney','1857':'Sanday','1858':'Market Harborough','1859':'Harris',
  '1862':'Tain','1863':'Ardgay','1864':'Abington','1865':'Oxford','1866':'Kilchrenan','1869':'Bicester','1870':'Isle of Benbecula',
  '1871':'Castlebay','1872':'Truro','1873':'Abergavenny','1874':'Brecon','1875':'Tranent','1876':'Lochmaddy',
  '1877':'Callander','1878':'Lochboisdale','1879':'Scarinish','1880':'Tarbert','1882':'Kinloch Rannoch','1883':'Caterham',
  '1884':'Tiverton','1885':'Pencombe','1886':'Bromyard','1887':'Aberfeldy','1888':'Turriff','1889':'Rugeley',
  '1890':'Ayton','1891':'Coldstream','1892':'Tunbridge Wells','1895':'Uxbridge','1896':'Galashiels','1899':'Biggar',
  '1900':'Workington','1902':'Wolverhampton','1903':'Worthing','1904':'York','1905':'Worcester','1908':'Milton Keynes',
  '1909':'Worksop','1910':'Tyneside','1912':'Tyneside','1913':'Durham','1914':'Tyneside','1915':'Sunderland',
  '1916':'Tyneside','1917':'Sunderland','1918':'Tyneside','1919':'Durham','1920':'Ware','1922':'Walsall','1923':'Watford',
  '1924':'Wakefield','1925':'Warrington','1926':'Warwick','1928':'Runcorn','1929':'Wareham','1931':'Shap','1932':'Weybridge',
  '1933':'Wellingborough','1934':'Weston-super-Mare','1935':'Yeovil','1937':'Wetherby','1938':'Welshpool','1939':'Wem',
  '1942':'Wigan','1943':'Guiseley','1944':'West Heslerton','1945':'Wisbech','1946':'Whitehaven','1947':'Whitby',
  '1948':'Whitchurch','1949':'Whatton','1950':'Sandwick','1951':'Isle of Colonsay','1952':'Telford','1953':'Wymondham',
  '1954':'Madingley','1955':'Wick','1957':'Mid Yell','1959':'Westerham','1962':'Winchester','1963':'Wincanton',
  '1964':'Hornsea','1967':'Strontian','1968':'Penicuik','1969':'Leyburn','1970':'Aberystwyth','1971':'Scourie',
  '1972':'Glenborrodale','1974':'Llanon','1975':'Alford','1977':'Pontefract','1978':'Wrexham','1980':'Amesbury',
  '1981':'Wormbridge','1982':'Builth Wells','1983':'Isle of Wight','1984':'Watchet','1985':'Warminster','1986':'Bungay',
  '1987':'Ebbsfleet','1988':'Wigtown','1989':'Ross-on-Wye','1992':'Lea Valley','1993':'Witney','1994':'St Clears',
  '1995':'Garstang','1997':'Strathpeffer','1224':'Aberdeen',
};
const UK_AREA_LENS = [5,4,3,2];
function ukArea(parsed){
  if(!parsed || parsed.country!=='GB') return '';
  const nsn = parsed.nationalNumber || '';
  for(const L of UK_AREA_LENS){
    const code = nsn.slice(0,L);
    if(UK_AREAS[code]) return UK_AREAS[code];
  }
  return '';
}

// ── Ofcom data (optional, loaded if ofcom-blocks.json present) ────────────
// Unified file powers BOTH allocation check and allocated-carrier lookup.
//   { lengths:[desc], carriers:[names], map:{ "<prefix>": carrierIndex } }
let ofcom = null;
(async function loadOfcom(){
  try{
    const res = await fetch('ofcom-blocks.json');   // normal HTTP caching (ETag/304)
    if(!res.ok) return;
    const raw = await res.json();
    if(!raw.map || !raw.lengths) return;
    ofcom = {
      lengths: raw.lengths.slice().sort((a,b)=>b-a),
      carriers: raw.carriers || [],
      map: raw.map,
    };
    const el = $('ofcomStatus');
    if(el) el.textContent = `Ofcom data loaded · ${Object.keys(raw.map).length.toLocaleString()} blocks · ${(raw.carriers||[]).length.toLocaleString()} carriers · ${(raw.generated||'').slice(0,10)}`;
  }catch(_){ /* no data file — allocation/carrier stay "unknown" */ }
})();

// Returns { alloc:'allocated'|'unallocated'|'unknown', carrier:'' }
function ofcomLookup(parsed){
  if(!ofcom || !parsed) return { alloc:'unknown', carrier:'' };
  const nsn = parsed.nationalNumber || String(parsed.number||'').replace(/\D/g,'').replace(/^44/,'');
  if(!nsn) return { alloc:'unknown', carrier:'' };
  for(const L of ofcom.lengths){
    if(nsn.length < L) continue;
    const idx = ofcom.map[nsn.slice(0, L)];
    if(idx !== undefined) return { alloc:'allocated', carrier: ofcom.carriers[idx] || '' };
  }
  return { alloc:'unallocated', carrier:'' };
}

// ── TPS / CTPS suppression (user-supplied licensed lists or paid API) ──────
let tpsSet  = null;   // consumer TPS numbers (E.164)
let ctpsSet = null;   // corporate CTPS numbers (E.164)
const apiHits = new Set();   // numbers an API reported as registered

// Parse a TPS/CTPS file into a Set of E.164 numbers.
async function parseSuppressionFile(file){
  const text = await file.text();
  const set = new Set();
  for(const tok of text.split(/[\s,;"']+/)){
    const t = tok.trim(); if(t.length < 7 || !/\d/.test(t)) continue;
    let p=null; try{ p=libphonenumber.parsePhoneNumber(t,'GB'); }catch(_){}
    if(p && p.isValid()) set.add(p.format('E.164'));
    else { const d=t.replace(/\D/g,''); if(d.length>=7) set.add('+44'+d.replace(/^0/,'')); }
  }
  return set;
}

function suppressionStatus(){
  const bits=[];
  if(tpsSet)  bits.push(`TPS ${tpsSet.size.toLocaleString()}`);
  if(ctpsSet) bits.push(`CTPS ${ctpsSet.size.toLocaleString()}`);
  if(apiHits.size) bits.push(`API ${apiHits.size.toLocaleString()}`);
  $('tpsStatus').textContent = bits.length ? bits.join(' · ')+' loaded' : 'No suppression list loaded';
}

$('tpsInput').addEventListener('change', async e => {
  const f=e.target.files[0]; if(!f) return;
  $('tpsStatus').textContent='Reading TPS list…';
  try{ tpsSet=await parseSuppressionFile(f); suppressionStatus();
       if(state.records.length){ applyTps(); updateStats(); renderTable(); } }
  catch(err){ $('tpsStatus').textContent='Could not read TPS file'; console.warn(err); }
});
$('ctpsInput').addEventListener('change', async e => {
  const f=e.target.files[0]; if(!f) return;
  $('tpsStatus').textContent='Reading CTPS list…';
  try{ ctpsSet=await parseSuppressionFile(f); suppressionStatus();
       if(state.records.length){ applyTps(); updateStats(); renderTable(); } }
  catch(err){ $('tpsStatus').textContent='Could not read CTPS file'; console.warn(err); }
});

// Enable the API button only when an endpoint is present.
$('tpsApiUrl').addEventListener('input', ()=>{
  $('btnTpsApi').disabled = !$('tpsApiUrl').value.trim() || !state.records.length;
});

// Auto-check landlines+mobiles against a paid TPS API endpoint.
$('btnTpsApi').addEventListener('click', async ()=>{
  const url=$('tpsApiUrl').value.trim(), key=$('tpsApiKey').value.trim(), field=($('tpsApiField').value.trim()||'registered');
  if(!url) return alert('Enter your provider endpoint, using {number} and {key} placeholders.');
  const targets=state.records.filter(r=>(r._status==='landline'||r._status==='mobile') && !r._tps);
  if(!targets.length) return alert('No un-suppressed callable numbers to check.');
  if(!confirm(`Check ${targets.length.toLocaleString()} numbers against your TPS API? (uses your paid quota)`)) return;
  $('btnTpsApi').disabled=true;
  let done=0;
  for(const r of targets){
    const u=url.replace('{number}',encodeURIComponent(r._e164)).replace('{key}',encodeURIComponent(key));
    try{
      const res=await fetch(u); const d=await res.json();
      const v=field.split('.').reduce((o,k)=>o==null?o:o[k], d);
      const reg = v===true || String(v).toLowerCase()==='true' || String(v).toLowerCase()==='yes' || v===1 || String(v)==='1';
      if(reg){ apiHits.add(r._e164); r._tps=true; r._suppress='API'; }
    }catch(_){ /* leave as-is on error */ }
    if(++done%10===0){ $('tpsApiStatus').textContent=`API checking ${done}/${targets.length}…`; renderTable(); }
  }
  $('tpsApiStatus').textContent=`Done — ${done.toLocaleString()} checked against TPS API.`;
  suppressionStatus(); updateStats(); renderTable(); $('btnTpsApi').disabled=false;
});

// Flag every record that matches any suppression source.
function applyTps(){
  state.records.forEach(r=>{
    const e=r._e164;
    const inT  = !!(tpsSet  && e && tpsSet.has(e));
    const inC  = !!(ctpsSet && e && ctpsSet.has(e));
    const inA  = !!(e && apiHits.has(e));
    r._tps = inT || inC || inA;
    r._suppress = inT ? 'TPS' : inC ? 'CTPS' : inA ? 'API' : '';
  });
}

// ── Step navigation ───────────────────────────────────────────────────────
function showStep(n){
  state.step = n;
  document.querySelectorAll('.step-panel').forEach(p=>p.classList.toggle('active', p.id==='step'+n));
  document.querySelectorAll('.step-chip').forEach(c=>{
    const s=+c.dataset.step;
    c.classList.toggle('active', s===n);
    c.classList.toggle('done', s<n);
  });
}
document.getElementById('stepper').addEventListener('click', e=>{
  const chip=e.target.closest('.step-chip'); if(!chip) return;
  const n=+chip.dataset.step;
  if(n===1) showStep(1);
  else if(n===2 && state.rawRecords.length) showStep(2);
  else if(n===3 && state.records.length) showStep(3);
  else if(n===4 && state.records.length){ updateScrubTargetInfo(); showStep(4); }
});
$('btnToValidate').addEventListener('click', ()=>{ if(state.rawRecords.length){ $('step2Info').textContent=`${state.rawRecords.length.toLocaleString()} rows from ${state.files.length} file(s) ready.`; showStep(2); }});
$('btnBack').addEventListener('click', ()=>showStep(1));
$('btnToScrub').addEventListener('click', ()=>{ if(state.records.length){ updateScrubTargetInfo(); showStep(4); }});
$('btnScrubBack').addEventListener('click', ()=>showStep(3));

// ── File ingestion → exact-file preview (Step 1) ──────────────────────────
$('folderInput').addEventListener('change', e => addFiles(e.target.files));
$('fileInput').addEventListener('change',   e => addFiles(e.target.files));

const dz = $('dropZone');
dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  const items = e.dataTransfer.items, collected = [];
  if (items && items.length && items[0].webkitGetAsEntry) {
    let pending = 0, done = false;
    const finish = () => { if (done && pending === 0) addFiles(collected); };
    const walk = entry => {
      if (entry.isFile) { pending++; entry.file(f => { if (isSupported(f.name)) collected.push(f); pending--; finish(); }); }
      else if (entry.isDirectory) {
        pending++;
        const rd = entry.createReader();
        const readBatch = () => rd.readEntries(ents => {
          if (ents.length) { ents.forEach(walk); readBatch(); } else { pending--; finish(); }
        });
        readBatch();
      }
    };
    for (const it of items) { const en = it.webkitGetAsEntry(); if (en) walk(en); }
    done = true; finish();
  } else {
    addFiles(e.dataTransfer.files);
  }
});

function isSupported(name){ return /\.(csv|xls|xlsx|txt)$/i.test(name); }

// ── Off-main-thread parsing (Web Worker) with main-thread fallback ─────────
let _parseWorker = null, _workerOff = false;
function getParseWorker(){
  if(_workerOff) return null;
  if(!_parseWorker){
    try{ _parseWorker = new Worker('parse-worker.js'); }
    catch(_){ _workerOff = true; return null; }
  }
  return _parseWorker;
}
function parseViaWorker(file, onProgress){
  return new Promise((resolve, reject)=>{
    const w = getParseWorker();
    if(!w) return reject(new Error('worker unavailable'));
    const onMsg = e=>{
      const m=e.data||{};
      if(m.type==='progress'){ if(onProgress) onProgress(m.count); }
      else if(m.type==='done'){ cleanup(); resolve(m.rows||[]); }
      else if(m.type==='error'){ cleanup(); reject(new Error(m.message||'parse error')); }
    };
    const onErr = ()=>{ cleanup(); _workerOff=true; _parseWorker=null; reject(new Error('worker crashed')); };
    function cleanup(){ w.removeEventListener('message', onMsg); w.removeEventListener('error', onErr); }
    w.addEventListener('message', onMsg);
    w.addEventListener('error', onErr);
    w.postMessage({ file });   // File is structured-cloneable
  });
}

async function addFiles(files){
  const incoming = Array.from(files).filter(f => isSupported(f.name));
  if(!incoming.length) return;
  state.files.push(...incoming);
  renderFileList();
  $('rawInfo').textContent = 'Reading files…';
  // Parse for the exact-file preview (no validation yet)
  for(const f of incoming){
    $('rawInfo').textContent = `Reading ${f.name}…`;
    await tick();                                   // let the UI paint before the heavy parse
    try{
      let rows;
      try{ rows = await parseViaWorker(f, c=>{ $('rawInfo').textContent = `Reading ${f.name}… ${c.toLocaleString()} rows`; }); }
      catch(werr){ rows = await parseFile(f); }     // worker unavailable → parse on main thread
      for(let i=0;i<rows.length;i++){ rows[i]._file=f.name; state.rawRecords.push(rows[i]); }  // element-wise (spread breaks on huge arrays)
      $('rawInfo').textContent = `Read ${state.rawRecords.length.toLocaleString()} rows so far…`;
    }
    catch(err){ console.warn('parse fail', f.name, err); $('rawInfo').textContent = `Could not read ${f.name}: ${err.message||err}`; }
    await tick();
  }
  renderRawPreview();
  $('btnToValidate').disabled = state.rawRecords.length === 0;
}

function renderFileList(){
  const p = $('fileListPanel');
  p.style.display = state.files.length ? '' : 'none';
  $('fileCount').textContent = state.files.length;
  $('fileList').innerHTML = state.files.map((f,i)=>`
    <li class="file-item"><span class="fi-name" title="${f.name}">${f.name}</span>
    <span class="fi-size">${fmtSize(f.size)}</span>
    <span class="fi-status done"></span></li>`).join('');
}
function fmtSize(b){ return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }

// Show the raw uploaded rows EXACTLY as in the file (first 100).
function renderRawPreview(){
  const recs = state.rawRecords;
  if(!recs.length){ $('rawEmpty').style.display=''; $('rawTable').style.display='none'; return; }
  $('rawEmpty').style.display='none'; $('rawTable').style.display='';
  const keys = Object.keys(recs[0]).filter(k=>k!=='_file');
  const detected = detectCol(recs, ($('phoneCol')?.value||'').trim().toLowerCase());
  $('rawInfo').textContent = `${recs.length.toLocaleString()} rows · ${keys.length} columns · phone column detected: “${detected||'?'}”`;
  $('rawHead').innerHTML = `<tr><th>#</th>${keys.map(k=>`<th${k===detected?' style="color:var(--accent)"':''}>${k}</th>`).join('')}</tr>`;
  $('rawBody').innerHTML = recs.slice(0,100).map((r,i)=>`<tr><td>${i+1}</td>${keys.map(k=>{
    const v=r[k]??''; return `<td title="${String(v).replace(/"/g,'&quot;')}">${String(v)}</td>`;
  }).join('')}</tr>`).join('');
}

// ── Run validation (Step 2 → 3) ───────────────────────────────────────────
$('btnProcess').addEventListener('click', runValidation);

async function runValidation(){
  if(!state.rawRecords.length) return;
  $('btnProcess').disabled = true;
  showStep(3);
  $('progressWrap').style.display = '';
  $('emptyState').style.display='none';

  // Fresh working copy from the raw rows (strip any prior _ fields)
  state.records = state.rawRecords.map(r=>{
    const o={}; for(const k of Object.keys(r)) if(!k.startsWith('_')||k==='_file') o[k]=r[k]; return o;
  });

  const defCountry = $('defaultCountry').value;
  const colHint = $('phoneCol').value.trim().toLowerCase();

  showProgress(40,'Detecting phone column…'); await tick();
  const phoneCol = detectCol(state.records, colHint);

  showProgress(50,'Validating & classifying…'); await tick();
  await classifyChunked(state.records, phoneCol, defCountry,
    { ofcom:$('optOfcom').checked, quality:$('optQuality').checked },
    (done,total)=>showProgress(50 + Math.round(done/total*30), `Validating ${done.toLocaleString()} / ${total.toLocaleString()}…`));

  if($('ukOnly').checked)
    state.records = state.records.filter(r => r._country === 'GB' || r._status === 'invalid');

  showProgress(78,'Checking against master list…'); await tick();
  if($('optMaster').checked) markOwned(state.records);

  showProgress(82,'Removing in-file duplicates…'); await tick();
  if($('dedup').checked) dedup(state.records);

  showProgress(92,'Checking suppression…'); await tick();
  applyTps();

  showProgress(100,'Done'); await tick();

  updateStats();
  $('progressWrap').style.display='none';
  $('btnExportSafe').disabled=false; $('btnExportLandline').disabled=false; $('btnExportAll').disabled=false; $('btnExportSQL').disabled=false;
  $('btnExportFresh').disabled=false; $('btnMasterAdd').disabled=false;
  $('btnToScrub').disabled=false; $('btnReport').disabled=false; updateScrubTargetInfo();
  $('btnTpsApi').disabled = !$('tpsApiUrl').value.trim();
  $('btnProcess').disabled = false;
  state.tab='landline'; setActiveTab('landline');
  renderTable();
}

function showProgress(p,l){ $('progressFill').style.width=p+'%'; $('progressLabel').textContent=l; }
const tick = () => new Promise(r=>setTimeout(r,0));

// ── Parsers ──────────────────────────────────────────────────────────────
function parseFile(f){
  const ext = f.name.split('.').pop().toLowerCase();
  if(ext==='csv'||ext==='txt') return parseCsv(f);
  return parseExcel(f);
}
function parseCsv(f){
  return new Promise((res,rej)=>Papa.parse(f,{header:true,skipEmptyLines:true,
    complete:r=>res(r.data),error:rej}));
}
function parseExcel(f){
  return new Promise((res,rej)=>{
    const rd=new FileReader();
    rd.onload=e=>{try{
      // Lean read: we only want cell values, not styles/number-formats/formulas.
      const wb=XLSX.read(e.target.result,{type:'array', cellStyles:false, cellNF:false, cellFormula:false, cellHTML:false, cellDates:false});
      const rows=[];
      wb.SheetNames.forEach(n=>{
        const ws=wb.Sheets[n];
        trimSheetRange(ws);                                    // guard against inflated ranges
        const part=XLSX.utils.sheet_to_json(ws,{defval:'', blankrows:false});
        for(let i=0;i<part.length;i++) rows.push(part[i]);     // element-wise (spread breaks on huge arrays)
      });
      res(rows);
    }catch(err){rej(err);}};
    rd.onerror=rej; rd.readAsArrayBuffer(f);
  });
}

// Clamp a sheet's declared range to the cells that actually hold data. Excel exports often
// declare an inflated dimension (e.g. A1:Z1048576); without this, sheet_to_json would build
// ~1,000,000 empty rows and freeze the tab for minutes on even a small real dataset.
function trimSheetRange(ws){
  if(!ws || !ws['!ref']) return;
  const dec=XLSX.utils.decode_range(ws['!ref']);
  if((dec.e.r - dec.s.r) < 20000) return;          // range already sane — leave it
  let maxR=0, maxC=0, seen=false;
  for(const k in ws){
    if(k.charCodeAt(0)===33) continue;             // skip '!ref', '!cols', '!merges', …
    const cell=XLSX.utils.decode_cell(k);
    seen=true;
    if(cell.r>maxR) maxR=cell.r;
    if(cell.c>maxC) maxC=cell.c;
  }
  ws['!ref']= seen ? XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:maxR,c:maxC}}) : 'A1';
}

// ── Column detection ─────────────────────────────────────────────────────
function detectCol(records, hint){
  if(!records.length) return null;
  const keys = Object.keys(records[0]);
  const norm = s => s.toLowerCase().replace(/[^a-z]/g,'');
  if(hint){
    const e=keys.find(k=>k.toLowerCase()===hint); if(e) return e;
    const p=keys.find(k=>k.toLowerCase().includes(hint)); if(p) return p;
  }
  for(const v of PHONE_VARIANTS){ const m=keys.find(k=>norm(k)===norm(v)); if(m) return m; }
  for(const v of PHONE_VARIANTS){ const m=keys.find(k=>norm(k).includes(norm(v))); if(m) return m; }
  // fallback: column whose values look most like phone numbers
  let best=null,score=-1;
  keys.forEach(k=>{
    const s=records.slice(0,50).filter(r=>/[\d]{6,}/.test(String(r[k]||''))).length;
    if(s>score){score=s;best=k;}
  });
  return best;
}

// ── Local junk / reserved-range quality check (free, offline) ─────────────
// Flags numbers that are valid+allocated but obviously not real subscribers.
function numberQuality(nsn, country){
  if(!nsn) return { q:'ok', reason:'' };

  // Ofcom-reserved "drama/fiction" ranges (never real lines) for GB:
  //  area + 496 0xxx / 7946 0xxx / 498 0xxx / 9018 0xxx / 2018 0xxx, and 1632 96xxxx
  if(country==='GB'){
    if(/^(11[3-8]|121|131|141|151|161)4960\d{3}$/.test(nsn)) return { q:'reserved', reason:'Ofcom drama range (496 0xxx)' };
    if(/^2079460\d{3}$/.test(nsn)) return { q:'reserved', reason:'Ofcom drama range (020 7946)' };
    if(/^1914980\d{3}$/.test(nsn)) return { q:'reserved', reason:'Ofcom drama range (0191 498)' };
    if(/^2890180\d{3}$/.test(nsn)) return { q:'reserved', reason:'Ofcom drama range (028 9018)' };
    if(/^2920180\d{3}$/.test(nsn)) return { q:'reserved', reason:'Ofcom drama range (029 2018)' };
    if(/^163296\d{4}$/.test(nsn))  return { q:'reserved', reason:'Ofcom drama range (01632)' };
  }

  // Subscriber portion = last 6–7 digits (after area code).
  const sub = nsn.slice(-7);

  // All identical digits (e.g. 0000000, 1111111)
  if(/^(\d)\1+$/.test(nsn) || /^(\d)\1{5,}$/.test(sub)) return { q:'suspect', reason:'All-same digits' };

  // Strictly sequential ascending or descending over the whole number
  const seq = s => { for(let i=1;i<s.length;i++){ const d=(+s[i])-(+s[i-1]); if(d!==1) return false; } return true; };
  const dseq = s => { for(let i=1;i<s.length;i++){ const d=(+s[i])-(+s[i-1]); if(d!==-1) return false; } return true; };
  if(nsn.length>=6 && (seq(nsn)||dseq(nsn))) return { q:'suspect', reason:'Sequential digits' };
  if(sub.length>=6 && (seq(sub)||dseq(sub))) return { q:'suspect', reason:'Sequential digits' };

  // Short repeating pattern in subscriber part (1212 12, 123123)
  if(/^(\d{2})\1{2,}$/.test(sub) || /^(\d{3})\1+$/.test(sub)) return { q:'suspect', reason:'Repeating pattern' };

  // Classic placeholder 12345678 anywhere
  if(/12345678|23456789|123456789/.test(nsn)) return { q:'suspect', reason:'Placeholder (12345678)' };

  // Excessive trailing zeros — often a switchboard/main line, not a DDI (soft)
  if(/0{5,}$/.test(nsn)) return { q:'round', reason:'Many trailing zeros (switchboard?)' };

  return { q:'ok', reason:'' };
}

// ── Validate + UK line-type classification (one record) ───────────────────
function classifyOne(r, phoneCol, defCountry, opts){
  const raw = phoneCol ? String(r[phoneCol]??'').trim() : '';
  r._raw = raw;
  if(!raw){ r._status='invalid'; r._base='invalid'; r._line='—'; r._reason='Missing'; r._e164=''; r._country=''; return; }

  let p=null;
  try{ p=libphonenumber.parsePhoneNumber(raw, defCountry); }
  catch(_){ try{ p=libphonenumber.parsePhoneNumber(raw); }catch(__){} }

  if(!p || !p.isValid()){
    r._status='invalid'; r._base='invalid'; r._line='—';
    r._reason = p ? 'Wrong length/area code' : 'Unparseable';
    r._e164 = raw; r._country='';
    return;
  }

  r._e164 = p.format('E.164');
  r._country = p.country || defCountry;
  r._national = p.formatNational();
  const type = p.getType(); // FIXED_LINE, MOBILE, FIXED_LINE_OR_MOBILE, VOIP, PREMIUM_RATE, TOLL_FREE, ...

  if(type==='FIXED_LINE'){ r._status='landline'; r._line='Landline'; }
  else if(type==='MOBILE'){ r._status='mobile'; r._line='Mobile'; }
  else if(type==='FIXED_LINE_OR_MOBILE'){ r._status='landline'; r._line='Fixed/Mobile'; }
  else if(type==='VOIP'){ r._status='other'; r._line='VoIP'; }
  else if(type==='PREMIUM_RATE'){ r._status='other'; r._line='Premium'; }
  else if(type==='TOLL_FREE'){ r._status='other'; r._line='Toll-free'; }
  else { r._status='other'; r._line=type||'Other'; }

  r._reason=''; r._live='';   // live status filled by API later
  r._area = ukArea(p);        // UK town/region (free, built-in)

  // Local junk/reserved-range quality check (free, offline) — optional
  const nsn = p.nationalNumber || '';
  if(opts.quality){
    const ql = numberQuality(nsn, r._country);
    r._quality = ql.q; r._qReason = ql.reason;
    if(ql.q==='reserved'){ r._status='invalid'; r._line='Reserved'; r._reason=ql.reason; }
  } else { r._quality='ok'; r._qReason=''; }

  // Ofcom block-allocation + allocated-carrier lookup (free) — optional
  if(opts.ofcom && r._country === 'GB'){
    const look = ofcomLookup(p);
    r._carrier = look.carrier || '';
    r._alloc = (r._status === 'landline' || r._line === 'Fixed/Mobile') ? look.alloc : 'unknown';
    if(r._alloc === 'unallocated' && r._status!=='invalid'){ r._status='invalid'; r._line='Unallocated'; r._reason='Block not allocated by Ofcom'; }
  } else { r._alloc='unknown'; r._carrier=''; }

  r._base = r._status;   // base bucket (landline/mobile/other/invalid) — owned/dup derive from this
}

// Chunked, non-blocking validation — yields to the UI every few thousand rows so
// 200k+ row datasets validate with a live progress bar instead of freezing the tab.
async function classifyChunked(records, phoneCol, defCountry, opts, onProgress){
  const total = records.length;
  for(let i=0;i<total;i++){
    classifyOne(records[i], phoneCol, defCountry, opts);
    if((i & 4095) === 4095){ if(onProgress) onProgress(i+1, total); await tick(); }
  }
  if(onProgress) onProgress(total, total);
}

// ── Mark leads already in the master list (cross-batch / "already owned") ──
// Runs BEFORE in-file dedup so owned numbers are never also tagged duplicate.
function markOwned(records){
  if(!masterSet.size) return;
  records.forEach(r=>{
    if(r._status==='invalid'||!r._e164) return;
    if(masterSet.has(r._e164)){ r._status='owned'; r._reason='Already in master list'; }
  });
}

// ── Deduplicate by E.164 (within this upload only) ───────────────────────
function dedup(records){
  const seen=new Set();
  records.forEach(r=>{
    if(r._status==='invalid'||r._status==='owned'||!r._e164) return;
    if(seen.has(r._e164)){ r._status='duplicate'; r._reason='Duplicate in this file'; }
    else seen.add(r._e164);
  });
}

// ── Re-derive owned/duplicate buckets from the base classification ────────
// Used when the master list changes while results are already on screen.
function recompute(){
  if(!state.records.length) return;
  state.records.forEach(r=>{ r._status = r._base; if(r._base!=='invalid') r._reason=''; });
  if($('optMaster').checked) markOwned(state.records);
  if($('dedup').checked)     dedup(state.records);
  applyTps(); updateStats(); renderTable();
}

// ── Stats ────────────────────────────────────────────────────────────────
function updateStats(){
  const c = s => state.records.filter(r=>r._status===s).length;
  $('sTotal').textContent = state.records.length.toLocaleString();
  $('sLand').textContent  = c('landline').toLocaleString();
  $('sMob').textContent   = c('mobile').toLocaleString();
  $('sOther').textContent = c('other').toLocaleString();
  $('sBad').textContent   = c('invalid').toLocaleString();
  $('sDup').textContent   = c('duplicate').toLocaleString();
  $('sOwned').textContent = c('owned').toLocaleString();
  $('sTps').textContent   = state.records.filter(r=>r._tps).length.toLocaleString();
}

// ── Filter + render ──────────────────────────────────────────────────────
function filtered(){
  let rows = state.records;
  if(state.tab==='tps') rows = rows.filter(r=>r._tps);
  else if(state.tab!=='all') rows = rows.filter(r=>r._status===state.tab);
  if(state.query){
    const q=state.query.toLowerCase();
    rows = rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q)));
  }
  if(state.sortCol){
    rows=[...rows].sort((a,b)=>{
      const av=String(a[state.sortCol]??'').toLowerCase(), bv=String(b[state.sortCol]??'').toLowerCase();
      return state.sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
    });
  }
  return rows;
}

function renderTable(){
  const rows=filtered();
  const totalPages=Math.max(1,Math.ceil(rows.length/state.pageSize));
  state.page=Math.min(state.page,totalPages);
  const pageRows=rows.slice((state.page-1)*state.pageSize, state.page*state.pageSize);

  if(!rows.length){ $('emptyState').style.display=''; $('dataTable').style.display='none'; $('pagination').style.display='none'; return; }
  $('emptyState').style.display='none'; $('dataTable').style.display='';

  const dataKeys = state.records.length ? Object.keys(state.records[0]).filter(k=>!k.startsWith('_')) : [];
  const cols = [...dataKeys, '_line', '_area', '_quality', '_e164'];
  if(ofcom){ cols.push('_alloc', '_carrier'); }
  if(tpsSet || ctpsSet || apiHits.size) cols.push('_tps');
  cols.push('_live', '_status');

  $('tableHead').innerHTML = `<tr>${cols.map(c=>{
    const label = c.startsWith('_') ? ({_line:'Line Type',_area:'Area',_quality:'Quality',_e164:'E.164',_alloc:'Ofcom Block',_carrier:'Carrier',_tps:'Suppression',_live:'Live Check',_status:'Status'}[c]||c.slice(1)) : c;
    return `<th data-col="${c}">${label}</th>`;
  }).join('')}</tr>`;

  $('tableBody').innerHTML = pageRows.map(r=>`<tr>${cols.map(c=>{
    if(c==='_status'){const m={landline:'b-landline ☎️ Landline',mobile:'b-mobile 📱 Mobile',other:'b-other 🔵 '+r._line,invalid:'b-invalid ❌ Invalid',duplicate:'b-duplicate 🔁 Dup',owned:'b-owned 📇 Owned'};
      const raw=m[r._status]||'b-other '+r._status;const cls=raw.split(' ')[0];const lbl=raw.split(' ').slice(1).join(' ');
      return `<td><span class="badge-status ${cls}">${lbl}</span></td>`;}
    if(c==='_e164') return `<td><code>${r._e164||''}</code></td>`;
    if(c==='_tps') return r._tps
      ? `<td><span class="badge-status b-tps">🚫 ${r._suppress||'Registered'}</span></td>`
      : `<td><span class="badge-status b-live-active">✅ Clear</span></td>`;
    if(c==='_live'){
      if(!r._live) return `<td><span class="badge-status b-live-unknown">—</span></td>`;
      const lc = r._live==='active'?'b-live-active ✅ Active':r._live==='dead'?'b-live-dead ❌ Dead':'b-live-unknown '+r._live;
      const cls=lc.split(' ')[0];const lbl=lc.split(' ').slice(1).join(' ');
      return `<td><span class="badge-status ${cls}">${lbl}</span></td>`;
    }
    if(c==='_alloc'){
      const a=r._alloc;
      if(a==='allocated') return `<td><span class="badge-status b-live-active">✅ Allocated</span></td>`;
      if(a==='unallocated') return `<td><span class="badge-status b-live-dead">❌ Unallocated</span></td>`;
      return `<td><span class="badge-status b-live-unknown">—</span></td>`;
    }
    if(c==='_line') return `<td>${r._line||''}</td>`;
    if(c==='_area') return `<td>${r._area||''}</td>`;
    if(c==='_carrier') return `<td title="${(r._carrier||'').replace(/"/g,'&quot;')}">${r._carrier||''}</td>`;
    if(c==='_quality'){
      const q=r._quality;
      if(q==='ok'||!q) return `<td><span class="badge-status b-live-active">✅ OK</span></td>`;
      if(q==='round') return `<td><span class="badge-status b-duplicate" title="${r._qReason||''}">🔵 Round</span></td>`;
      const cls = q==='reserved' ? 'b-invalid' : 'b-tps';
      const lbl = q==='reserved' ? '🎭 Reserved' : '⚠️ Pattern';
      return `<td><span class="badge-status ${cls}" title="${r._qReason||''}">${lbl}</span></td>`;
    }
    const v=r[c]??''; return `<td title="${String(v).replace(/"/g,'&quot;')}">${String(v)}</td>`;
  }).join('')}</tr>`).join('');

  $('pagination').style.display='';
  $('pgInfo').textContent=`Page ${state.page} of ${totalPages} (${rows.length.toLocaleString()} rows)`;
  $('pgPrev').disabled=state.page<=1; $('pgNext').disabled=state.page>=totalPages;

  $('tableHead').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{
    const c=th.dataset.col;
    if(state.sortCol===c) state.sortDir=state.sortDir==='asc'?'desc':'asc';
    else{state.sortCol=c;state.sortDir='asc';}
    state.page=1; renderTable();
  }));
}

// ── Tabs / search / paging ──────────────────────────────────────────────
function setActiveTab(t){ document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t)); }
$('tabBar').addEventListener('click',e=>{
  const t=e.target.closest('.tab'); if(!t) return;
  state.tab=t.dataset.tab; state.page=1; setActiveTab(state.tab); renderTable();
});
let st; $('searchInput').addEventListener('input',e=>{clearTimeout(st);st=setTimeout(()=>{state.query=e.target.value.trim();state.page=1;renderTable();},200);});
$('pgPrev').addEventListener('click',()=>{state.page--;renderTable();});
$('pgNext').addEventListener('click',()=>{state.page++;renderTable();});

// ── Online scrubbing: bot worker pool + free-API providers (Step 4) ────────
// Read a possibly-nested field (dot path) from a response object.
const dig = (o,path) => path.split('.').reduce((x,k)=> x==null?x:x[k], o);
const sleep = ms => new Promise(r=>setTimeout(r, ms));
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

// Free providers: endpoint template + the JSON field that signals a valid/active line.
const PROVIDERS = {
  veriphone: { name:'Veriphone',    url:'https://api.veriphone.io/v2/verify?phone={number}&key={key}',          field:'phone_valid' },
  numlookup: { name:'NumLookupAPI', url:'https://api.numlookupapi.com/v1/validate/{number}?apikey={key}',       field:'valid' },
  abstract:  { name:'AbstractAPI',  url:'https://phonevalidation.abstractapi.com/v1/?api_key={key}&phone={number}', field:'valid' },
};

// ── Scrub cache (persistent, by E.164) ─────────────────────────────────────
const scrubCacheMap = new Map();
async function scrubCacheLoad(){
  try{
    const db=await openDB();
    const all=await new Promise((res,rej)=>{const tx=db.transaction(CACHE_STORE,'readonly');const rq=tx.objectStore(CACHE_STORE).getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);});
    scrubCacheMap.clear(); all.forEach(o=>scrubCacheMap.set(o.e,{live:o.live, by:o.by}));
  }catch(_){}
}
function scrubCachePut(e164, live, by){
  scrubCacheMap.set(e164,{live, by});
  openDB().then(db=>{ const tx=db.transaction(CACHE_STORE,'readwrite'); tx.objectStore(CACHE_STORE).put({e:e164, live, by, at:Date.now()}); }).catch(()=>{});
}
async function scrubCacheClear(){
  scrubCacheMap.clear();
  try{ const db=await openDB(); await new Promise((res,rej)=>{const tx=db.transaction(CACHE_STORE,'readwrite');tx.objectStore(CACHE_STORE).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }catch(_){}
}

// ── Monthly free-quota meter (per provider, in localStorage) ────────────────
const PROVIDER_LIMITS = { veriphone:1000, numlookup:100, abstract:100 };
const monthKey  = () => new Date().toISOString().slice(0,7);                  // YYYY-MM
const quotaKey  = id => `pwq_${id}_${monthKey()}`;
const quotaUsed = id => parseInt(localStorage.getItem(quotaKey(id))||'0',10);
const quotaRemaining = id => { const lim=PROVIDER_LIMITS[id]; return lim==null?Infinity:Math.max(0, lim-quotaUsed(id)); };
function quotaBump(id){ if(PROVIDER_LIMITS[id]==null) return; localStorage.setItem(quotaKey(id), String(quotaUsed(id)+1)); }
function renderQuota(){
  for(const id of ['veriphone','numlookup','abstract']){
    const el=$('quota'+cap(id)); if(!el) continue;
    el.textContent = `${quotaUsed(id).toLocaleString()} / ${PROVIDER_LIMITS[id].toLocaleString()} used this month`;
    el.classList.toggle('maxed', quotaRemaining(id)<=0);
  }
}
// Round-robin to the next provider that still has monthly quota (custom = unlimited).
function nextProvider(){
  const n=scrub.providers.length;
  for(let k=0;k<n;k++){
    const p=scrub.providers[(scrub.call++) % n];
    if(quotaRemaining(p.id) > 0) return p;
  }
  return null;   // every provider is at its monthly free limit
}

const scrub = { running:false, queue:[], idx:0, call:0, providers:[], throttle:1100, counters:null };

// Active provider list, in round-robin order, from the enabled rows.
function buildScrubProviders(){
  const list=[];
  for(const id of ['veriphone','numlookup','abstract']){
    if($('pv'+cap(id)).checked){
      const key=$('key'+cap(id)).value.trim();
      if(key){ const p=PROVIDERS[id]; list.push({id, name:p.name, url:p.url, field:p.field, key}); }
    }
  }
  if($('pvCustom').checked){
    const url=$('customUrl').value.trim();
    if(url) list.push({id:'custom', name:'Custom', url, field:($('customField').value.trim()||'valid'), key:$('customKey').value.trim()});
  }
  return list;
}

// Callable numbers to scrub (optionally skipping ones already checked).
function scrubTargets(){
  const skip=$('scrubSkip').checked;
  return state.records.filter(r=>(r._status==='landline'||r._status==='mobile') && !(skip && r._live));
}
function updateScrubTargetInfo(){
  if(!$('scrubTargetInfo')) return;
  const n=scrubTargets().length;
  $('scrubTargetInfo').textContent = state.records.length ? `${n.toLocaleString()} callable number(s) queued.` : 'Run validation first.';
  $('btnScrubStart').disabled = scrub.running || !state.records.length;
  renderQuota();
}

function renderBotBoard(n){
  $('botBoard').innerHTML = Array.from({length:n},(_,i)=>
    `<div class="bot-row" id="bot${i}"><span class="bot-dot"></span><span class="bot-id">Bot ${i+1}</span><span class="bot-state" id="botState${i}">idle</span></div>`
  ).join('');
}
function setBot(id, busy, txt){
  const row=$('bot'+id); if(!row) return;
  row.classList.toggle('busy', busy);
  const s=$('botState'+id); if(s) s.textContent = txt;
}
function updateScrubStats(){
  const c=scrub.counters; if(!c) return;
  $('scrubDone').textContent    = c.done.toLocaleString();
  $('scrubTotal').textContent   = c.total.toLocaleString();
  $('scrubActive').textContent  = c.active.toLocaleString();
  $('scrubDead').textContent    = c.dead.toLocaleString();
  $('scrubUnknown').textContent = c.unknown.toLocaleString();
  $('scrubCached').textContent  = (c.cached||0).toLocaleString();
  $('scrubProgress').textContent = scrub.running
    ? `Scrubbing ${c.done}/${c.total}…`
    : (c.done ? `Finished — ${c.done}/${c.total} checked (✅ ${c.active} · ❌ ${c.dead} · ⚠️ ${c.unknown}).` : '');
}

// One bot: pulls the next number, picks the next provider (round-robin), checks it.
async function botWorker(botId){
  const useCache = $('scrubCacheChk').checked;
  while(scrub.running){
    const i = scrub.idx++;
    if(i >= scrub.queue.length) break;
    const r = scrub.queue[i];

    // 1) cache hit — no API call, no quota, no throttle
    if(useCache && scrubCacheMap.has(r._e164)){
      const c = scrubCacheMap.get(r._e164);
      r._live = c.live; r._liveBy = (c.by||'cache') + ' (cached)';
      scrub.counters[c.live==='active'?'active':c.live==='dead'?'dead':'unknown']++;
      scrub.counters.cached++; scrub.counters.done++;
      if(scrub.counters.done % 5 === 0){ updateScrubStats(); renderTable(); }
      continue;
    }

    // 2) pick a provider that still has monthly free quota
    const prov = nextProvider();
    if(!prov){ scrub.running=false; $('scrubProgress').textContent='Stopped — every provider hit its monthly free limit.'; break; }

    setBot(botId, true, `${prov.name} · ${r._e164}`);
    quotaBump(prov.id);                                   // count the request (protects the free tier)
    const u = prov.url.replace('{number}', encodeURIComponent(r._e164))
                      .replace('{key}',    encodeURIComponent(prov.key||''));
    try{
      const d = await (await fetch(u)).json();
      const v = dig(d, prov.field);
      const active = v===true || v===1 || ['true','active','yes','1'].includes(String(v).toLowerCase());
      r._live = active ? 'active' : 'dead';
      r._liveBy = prov.name;
      if(d && d.carrier && !r._carrier) r._carrier = typeof d.carrier==='string' ? d.carrier : (d.carrier.name||'');
      scrub.counters[active ? 'active' : 'dead']++;
      scrubCachePut(r._e164, r._live, prov.name);         // remember so we never re-spend quota on it
    }catch(_){ r._live='unknown'; scrub.counters.unknown++; }
    scrub.counters.done++;
    if(scrub.counters.done % 5 === 0){ updateScrubStats(); renderTable(); renderQuota(); }
    if(scrub.throttle) await sleep(scrub.throttle);
  }
  setBot(botId, false, 'idle');
}

async function startScrub(){
  if(scrub.running) return;
  const providers = buildScrubProviders();
  if(!providers.length) return alert('Enable at least one provider and enter its API key (or a custom endpoint).');
  const targets = scrubTargets();
  if(!targets.length) return alert('No callable numbers to scrub. Run validation first.');
  if(!confirm(`Scrub ${targets.length.toLocaleString()} numbers across ${providers.length} provider(s)? This uses your free quota.`)) return;

  const n = Math.max(1, Math.min(8, +$('botCount').value || 3));
  scrub.throttle = Math.max(0, +$('botThrottle').value || 0);
  Object.assign(scrub, { running:true, queue:targets, idx:0, call:0, providers,
    counters:{ done:0, active:0, dead:0, unknown:0, cached:0, total:targets.length } });

  renderQuota();
  renderBotBoard(n);
  $('btnScrubStart').disabled=true; $('btnScrubStop').disabled=false;
  updateScrubStats();
  await Promise.all(Array.from({length:n}, (_,i)=>botWorker(i)));

  scrub.running=false;
  $('btnScrubStart').disabled=false; $('btnScrubStop').disabled=true;
  updateScrubStats(); renderTable();
}
function stopScrub(){ if(scrub.running){ scrub.running=false; $('scrubProgress').textContent='Stopping…'; } }

$('btnScrubStart').addEventListener('click', startScrub);
$('btnScrubStop').addEventListener('click', stopScrub);
$('btnClearScrubCache').addEventListener('click', async ()=>{
  if(!scrubCacheMap.size) return alert('Cache is already empty.');
  if(!confirm(`Clear ${scrubCacheMap.size.toLocaleString()} cached result(s)? Those numbers will be re-checked (uses quota) next scrub.`)) return;
  await scrubCacheClear();
  alert('Scrub cache cleared.');
});
['pvVeriphone','pvNumlookup','pvAbstract','pvCustom','botCount','botThrottle','scrubSkip']
  .forEach(id=>{ const el=$(id); if(el) el.addEventListener('change', updateScrubTargetInfo); });
scrubCacheLoad(); renderQuota();

// ── Export ───────────────────────────────────────────────────────────────
// TPS-safe: valid landlines + mobiles, excluding TPS-registered numbers
$('btnExportSafe').addEventListener('click',()=>{
  const auto = $('tpsAuto').checked;
  exportRows(r=>(r._status==='landline'||r._status==='mobile') && !(auto && r._tps),'uk_tps_safe.csv');
});
$('btnExportLandline').addEventListener('click',()=>exportRows(r=>r._status==='landline','uk_landlines.csv'));
$('btnExportAll').addEventListener('click',()=>exportRows(()=>true,'all_processed.csv'));

// Fresh leads = valid, callable, NOT already owned and NOT an in-file duplicate —
// i.e. the unique new numbers actually worth paying for.
$('btnExportFresh').addEventListener('click',()=>{
  const auto = $('tpsAuto').checked;
  exportRows(r=>(r._status==='landline'||r._status==='mobile'||r._status==='other') && !(auto && r._tps),'fresh_leads.csv');
});

// Add every valid number in the current results to the persistent master list,
// so the next batch recognises them as already owned.
$('btnMasterAdd').addEventListener('click', async ()=>{
  const e164s = state.records.filter(r=>r._status!=='invalid' && r._e164).map(r=>r._e164);
  if(!e164s.length) return alert('No valid numbers to add.');
  const added = await masterAddBulk(e164s);
  recompute();
  alert(`Added ${added.toLocaleString()} new number(s) to your master list. It now holds ${masterSet.size.toLocaleString()}.`);
});

function exportRows(pred, filename){
  const rows=state.records.filter(pred);
  if(!rows.length) return alert('Nothing to export in this set.');
  const dataKeys=Object.keys(rows[0]).filter(k=>!k.startsWith('_'));
  const out=rows.map(r=>{
    const o={}; dataKeys.forEach(k=>o[k]=r[k]??'');
    o.e164=r._e164; o.line_type=r._line; o.area=r._area||''; o.status=r._status;
    o.ofcom_block=r._alloc||''; o.carrier=r._carrier||'';
    o.quality=r._quality||''; o.quality_reason=r._qReason||'';
    o.tps_registered=r._tps?'yes':'no'; o.suppress_source=r._suppress||''; o.live_check=r._live||'';
    return o;
  });
  const csv=Papa.unparse(out);
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  URL.revokeObjectURL(a.href);
}

// ── Export SQL (CREATE TABLE + INSERTs matching database/schema.sql) ───────
$('btnExportSQL').addEventListener('click', exportSQL);
const sqlStr = v => v==null||v==='' ? 'NULL' : `N'${String(v).replace(/'/g,"''")}'`;
const sqlBit = b => b ? '1' : '0';

function exportSQL(){
  if(!state.records.length) return alert('Run validation first.');
  const name = ($('datasetName').value.trim()) || 'workstation import';
  const known = new Set(['first_name','firstname','last_name','lastname','surname','email','town','city','postcode','postal_code']);
  const pick = (r,keys)=>{ for(const k of Object.keys(r)){ if(k.startsWith('_'))continue; const n=k.toLowerCase().replace(/[^a-z]/g,''); if(keys.includes(n)) return r[k]; } return ''; };

  const lines = [];
  lines.push('-- Generated by UK Validation Workstation');
  lines.push('-- Run database/schema.sql first to create the tables.');
  lines.push('USE PhoneValidation;');
  lines.push('GO');
  lines.push(`INSERT INTO dbo.ImportBatch(name, source_files, total_rows) VALUES (${sqlStr(name)}, ${sqlStr([...new Set(state.records.map(r=>r._file).filter(Boolean))].join(', '))}, ${state.records.length});`);
  lines.push('DECLARE @b INT = SCOPE_IDENTITY();');
  lines.push('GO');

  const cols = '(batch_id,phone_e164,country,line_type,status,area,ofcom_block,carrier,quality,quality_reason,tps_registered,suppress_source,live_check,first_name,last_name,email,town,postcode,raw_data)';
  // Batch INSERTs in chunks of 1000 (SQL Server row-constructor limit)
  for(let i=0;i<state.records.length;i+=1000){
    const chunk = state.records.slice(i,i+1000);
    const vals = chunk.map(r=>{
      const raw={}; for(const k of Object.keys(r)) if(!k.startsWith('_')||k==='_file') raw[k]=r[k];
      const fn = pick(r,['firstname']), ln = pick(r,['lastname','surname']);
      return `(@b,${sqlStr(r._e164)},${sqlStr(r._country)},${sqlStr(r._line)},${sqlStr(r._status)},`+
             `${sqlStr(r._area)},${sqlStr(r._alloc)},${sqlStr(r._carrier)},${sqlStr(r._quality)},${sqlStr(r._qReason)},`+
             `${sqlBit(r._tps)},${sqlStr(r._suppress)},${sqlStr(r._live)},`+
             `${sqlStr(fn)},${sqlStr(ln)},${sqlStr(pick(r,['email']))},${sqlStr(pick(r,['town','city']))},${sqlStr(pick(r,['postcode','postalcode']))},`+
             `${sqlStr(JSON.stringify(raw))})`;
    }).join(',\n');
    lines.push(`INSERT INTO dbo.Contacts ${cols} VALUES\n${vals};`);
    lines.push('GO');
  }

  const blob = new Blob([lines.join('\n')], {type:'application/sql;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = name.replace(/[^\w]+/g,'_')+'.sql'; a.click();
  URL.revokeObjectURL(a.href);
}

// ── Reset ────────────────────────────────────────────────────────────────
// ── Batch report (savings / ROI) ──────────────────────────────────────────
function buildReport(){
  const c = s => state.records.filter(r=>r._status===s).length;
  const total    = state.records.length;
  const fresh    = state.records.filter(r=>['landline','mobile','other'].includes(r._status)).length;
  const owned    = c('owned');
  const dup      = c('duplicate');
  const invalid  = c('invalid');
  const dontPay  = owned + dup + invalid;
  const active   = state.records.filter(r=>r._live==='active').length;
  const dead     = state.records.filter(r=>r._live==='dead').length;
  const scrubbed = state.records.filter(r=>r._live).length;
  return { total, fresh, owned, dup, invalid, dontPay, active, dead, scrubbed };
}
const fmtMoney = n => '£' + n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});

function reportSaved(){
  const r=buildReport(), price=parseFloat($('reportPrice').value)||0;
  $('reportSaved').textContent = price>0
    ? `Avoided paying ~${fmtMoney(r.dontPay*price)} (${r.dontPay.toLocaleString()} leads × ${fmtMoney(price)}).`
    : '';
}
function openReport(){
  if(!state.records.length) return alert('Run validation first.');
  const r=buildReport();
  const scrub = r.scrubbed
    ? `<div class="rep-sub">live scrub</div>
       <div class="rep-row"><span>✅ Active</span><b>${r.active.toLocaleString()}</b></div>
       <div class="rep-row"><span>❌ Dead</span><b>${r.dead.toLocaleString()}</b></div>` : '';
  $('reportBody').innerHTML = `<div class="rep-grid">
    <div class="rep-row rep-total"><span>Total uploaded</span><b>${r.total.toLocaleString()}</b></div>
    <div class="rep-row rep-pay"><span>✅ Fresh — worth buying</span><b>${r.fresh.toLocaleString()}</b></div>
    <div class="rep-sub">don’t pay for these</div>
    <div class="rep-row"><span>📇 Already owned</span><b>${r.owned.toLocaleString()}</b></div>
    <div class="rep-row"><span>🔁 In-file duplicates</span><b>${r.dup.toLocaleString()}</b></div>
    <div class="rep-row"><span>❌ Invalid</span><b>${r.invalid.toLocaleString()}</b></div>
    ${scrub}
    <div class="rep-row rep-headline"><span>You only pay for</span><b>${r.fresh.toLocaleString()} of ${r.total.toLocaleString()}</b></div>
  </div>`;
  reportSaved();
  $('reportModal').style.display='flex';
}
function exportReport(){
  const r=buildReport(), price=parseFloat($('reportPrice').value)||0;
  const rows=[['Metric','Value'],
    ['Total uploaded', r.total],['Fresh (payable)', r.fresh],
    ['Already owned', r.owned],['In-file duplicates', r.dup],['Invalid', r.invalid],
    ['Do-not-pay total', r.dontPay]];
  if(r.scrubbed){ rows.push(['Scrubbed', r.scrubbed],['Active', r.active],['Dead', r.dead]); }
  if(price>0){ rows.push(['Price per lead', price],['Estimated amount saved', (r.dontPay*price).toFixed(2)]); }
  const blob=new Blob([Papa.unparse(rows)],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='batch_report.csv'; a.click(); URL.revokeObjectURL(a.href);
}
$('btnReport').addEventListener('click', openReport);
$('reportClose').addEventListener('click', ()=>$('reportModal').style.display='none');
$('reportDone').addEventListener('click', ()=>$('reportModal').style.display='none');
$('reportExport').addEventListener('click', exportReport);
$('reportPrice').addEventListener('input', reportSaved);
$('reportModal').addEventListener('click', e=>{ if(e.target===$('reportModal')) $('reportModal').style.display='none'; });

$('btnReset').addEventListener('click',()=>{
  Object.assign(state,{files:[],rawRecords:[],records:[],tab:'landline',query:'',sortCol:null,page:1,step:1});
  $('folderInput').value=''; $('fileInput').value=''; $('fileList').innerHTML='';
  $('fileListPanel').style.display='none';
  $('rawEmpty').style.display=''; $('rawTable').style.display='none';
  $('rawInfo').textContent='Select files to see their raw contents here.';
  $('dataTable').style.display='none'; $('emptyState').style.display='';
  $('pagination').style.display='none';
  $('btnToValidate').disabled=true;
  $('btnExportSafe').disabled=true; $('btnExportLandline').disabled=true; $('btnExportAll').disabled=true; $('btnToScrub').disabled=true;
  $('btnExportFresh').disabled=true; $('btnMasterAdd').disabled=true; $('btnReport').disabled=true;
  $('searchInput').value='';
  // Reset online-scrub state
  scrub.running=false; scrub.counters=null;
  $('botBoard').innerHTML=''; $('scrubProgress').textContent='';
  $('btnScrubStart').disabled=true; $('btnScrubStop').disabled=true;
  showStep(1);
});

// ── Local storage: IndexedDB dataset persistence ──────────────────────────
const DB_NAME='ukval', STORE='datasets', MASTER_STORE='master', CACHE_STORE='scrubcache';
function openDB(){
  return new Promise((res,rej)=>{
    const rq=indexedDB.open(DB_NAME,3);
    rq.onupgradeneeded=()=>{ const db=rq.result;
      if(!db.objectStoreNames.contains(STORE))        db.createObjectStore(STORE,{keyPath:'id'});
      if(!db.objectStoreNames.contains(MASTER_STORE)) db.createObjectStore(MASTER_STORE,{keyPath:'p'}); // p = E.164, the key itself
      if(!db.objectStoreNames.contains(CACHE_STORE))  db.createObjectStore(CACHE_STORE,{keyPath:'e'}); // e = E.164, plus {live,by,at}
    };
    rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);
  });
}
async function dbPut(rec){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(rec);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }
async function dbAll(){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const rq=tx.objectStore(STORE).getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);}); }
async function dbGet(id){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const rq=tx.objectStore(STORE).get(id);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);}); }
async function dbDel(id){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}); }

// ── Master list store: persistent set of E.164 numbers you already own ─────
const masterSet = new Set();

async function masterLoad(){
  try{
    const db=await openDB();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(MASTER_STORE,'readonly');const rq=tx.objectStore(MASTER_STORE).getAllKeys();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);});
    masterSet.clear(); keys.forEach(k=>masterSet.add(k));
  }catch(_){ /* no store yet */ }
  masterStatus();
}
async function masterAddBulk(e164s){
  const fresh=[...new Set(e164s)].filter(e=>e && !masterSet.has(e));
  if(fresh.length){
    const db=await openDB();
    await new Promise((res,rej)=>{const tx=db.transaction(MASTER_STORE,'readwrite');const st=tx.objectStore(MASTER_STORE);fresh.forEach(p=>st.put({p}));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});
    fresh.forEach(e=>masterSet.add(e));
  }
  masterStatus();
  return fresh.length;
}
async function masterClearAll(){
  const db=await openDB();
  await new Promise((res,rej)=>{const tx=db.transaction(MASTER_STORE,'readwrite');tx.objectStore(MASTER_STORE).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});
  masterSet.clear(); masterStatus();
}
function masterStatus(){
  const n=masterSet.size;
  if($('masterCount'))  $('masterCount').textContent=n.toLocaleString();
  if($('masterStatus')) $('masterStatus').textContent = n
    ? `${n.toLocaleString()} owned number(s) — every new lead is checked against these.`
    : 'No master numbers yet. Import the numbers you already own.';
}

// Parse a file of owned numbers (CSV / TXT / Excel) into a Set of E.164.
async function parseOwnedFile(file, defCountry){
  const ext=file.name.split('.').pop().toLowerCase();
  let tokens=[];
  if(ext==='xls'||ext==='xlsx'){
    const rows=await parseExcel(file);
    rows.forEach(r=>Object.values(r).forEach(v=>{ if(v!=null && v!=='') tokens.push(String(v)); }));
  }else{
    tokens=(await file.text()).split(/[\s,;"'\t]+/);
  }
  const set=new Set();
  for(const tok of tokens){
    const t=String(tok).trim(); if(t.length<7 || !/\d/.test(t)) continue;
    let p=null; try{ p=libphonenumber.parsePhoneNumber(t, defCountry||'GB'); }catch(_){}
    if(p && p.isValid()) set.add(p.format('E.164'));
  }
  return set;
}

$('masterImport').addEventListener('change', async e=>{
  const f=e.target.files[0]; if(!f) return;
  $('masterStatus').textContent='Reading owned numbers…';
  try{
    const def=$('defaultCountry')?.value||'GB';
    const set=await parseOwnedFile(f, def);
    const added=await masterAddBulk([...set]);
    $('masterStatus').textContent=`Imported ${set.size.toLocaleString()} valid number(s) · ${added.toLocaleString()} new · master now ${masterSet.size.toLocaleString()}.`;
    e.target.value='';
    recompute();   // re-flag on-screen results against the updated master
  }catch(err){ $('masterStatus').textContent='Could not read that file.'; console.warn(err); }
});
$('btnMasterClear').addEventListener('click', async ()=>{
  if(!masterSet.size) return;
  if(!confirm(`Clear all ${masterSet.size.toLocaleString()} owned numbers from the master list?`)) return;
  await masterClearAll();
  recompute();
});
masterLoad();

$('btnSave').addEventListener('click', async ()=>{
  if(!state.records.length) return alert('Nothing to save yet.');
  const name=($('datasetName').value.trim())||`dataset ${new Date().toLocaleString()}`;
  const rec={ id:'ds_'+Date.now(), name, savedAt:new Date().toISOString(), count:state.records.length, records:state.records };
  try{ await dbPut(rec); $('datasetName').value=''; await refreshSaved(); alert(`Saved “${name}” (${rec.count.toLocaleString()} rows) to local storage.`); }
  catch(err){ alert('Save failed: '+err.message); }
});

async function refreshSaved(){
  let list=[]; try{ list=await dbAll(); }catch(_){}
  list.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  $('savedCount').textContent=list.length;
  $('savedList').innerHTML = list.length ? list.map(d=>`
    <li class="file-item">
      <span class="fi-name" title="${d.name}">${d.name}</span>
      <span class="fi-size">${d.count.toLocaleString()}</span>
      <button class="btn btn-ghost btn-sm" data-load="${d.id}">Load</button>
      <button class="btn btn-ghost btn-sm" data-del="${d.id}">✕</button>
    </li>`).join('') : '<li class="text-muted" style="font-size:12px;list-style:none">None yet.</li>';
}
$('savedList').addEventListener('click', async e=>{
  const load=e.target.closest('[data-load]'), del=e.target.closest('[data-del]');
  if(load){
    const d=await dbGet(load.dataset.load); if(!d) return;
    state.records=d.records; state.rawRecords=d.records.slice();
    state.records.forEach(r=>{ if(r._base===undefined) r._base=r._status; });
    updateStats(); $('btnExportSafe').disabled=false; $('btnExportLandline').disabled=false; $('btnExportAll').disabled=false; $('btnExportSQL').disabled=false;
    $('btnExportFresh').disabled=false; $('btnMasterAdd').disabled=false; $('btnToScrub').disabled=false; $('btnReport').disabled=false;
    state.tab='landline'; setActiveTab('landline'); renderTable(); showStep(3);
  } else if(del){
    if(confirm('Delete this saved dataset?')){ await dbDel(del.dataset.del); refreshSaved(); }
  }
});
refreshSaved();

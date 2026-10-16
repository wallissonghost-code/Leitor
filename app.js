const $=s=>document.querySelector(s),video=$('#video'),start=$('#start'),stop=$('#stop'),ocr=$('#ocr'),statusEl=$('#status'),empty=$('#empty'),data=$('#data'),formatEl=$('#format'),valueEl=$('#value'),timeEl=$('#time'),copy=$('#copy'),person=$('#person'),ocrState=$('#ocrState'),canvas=$('#capture'),snapshot=$('#snapshot');
let stream=null,nativeDetector=null,zxingReader=null,running=false,lastValue='',lastAt=0,raf=0,ocrBusy=false;const foundCodes=new Map();
function setStatus(t){statusEl.textContent=t}
function renderCodes(){const panel=$('#codesPanel'),list=$('#codesList'),count=$('#codesCount');if(!panel||!list)return;panel.hidden=false;const arr=[...foundCodes.values()];count.textContent=String(arr.length);list.innerHTML=arr.length?arr.map((c,i)=>'<div class="code-row"><span>CÓDIGO '+(i+1)+' · '+escapeHtml(c.format)+'</span><strong>'+escapeHtml(c.value)+'</strong></div>').join(''):'<div class="empty">Nenhum código detectado ainda.</div>'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addCode(value,format='código'){if(value){foundCodes.set(value,{value,format:String(format||'código')});renderCodes()}}function showResult(value,format='código'){addCode(value,format);const now=Date.now();if(value===lastValue&&now-lastAt<2500)return;lastAt=now;lastValue=value;empty.hidden=true;data.hidden=false;formatEl.textContent=String(format).toUpperCase();valueEl.textContent=value;timeEl.textContent='Lido em '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});copy.disabled=false;if(navigator.vibrate)navigator.vibrate(80)}
async function begin(){try{if(!navigator.mediaDevices?.getUserMedia)throw Error('camera');start.disabled=true;setStatus('Abrindo câmera');if('BarcodeDetector'in window){const f=await BarcodeDetector.getSupportedFormats();nativeDetector=new BarcodeDetector({formats:f});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});video.srcObject=stream;await video.play();running=true;stop.disabled=false;ocr.disabled=false;setStatus('Escaneando');nativeScan();return}if(!window.ZXing)throw Error('zxing');zxingReader=new ZXing.BrowserMultiFormatReader();running=true;stop.disabled=false;ocr.disabled=false;setStatus('Escaneando');await zxingReader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}},video,(r)=>{if(r&&running)showResult(r.getText(),r.getBarcodeFormat?ZXing.BarcodeFormat[r.getBarcodeFormat()]:'código')})}catch(e){console.error(e);end();setStatus('Falha na câmera');alert(e?.name==='NotAllowedError'?'Permita o acesso à câmera no Safari e tente novamente.':'Não consegui iniciar o leitor. Atualize a página e tente novamente.')}}
async function nativeScan(){if(!running)return;try{const c=await nativeDetector.detect(video);if(c.length)showResult(c[0].rawValue,c[0].format||'código')}catch(e){}raf=requestAnimationFrame(nativeScan)}
function end(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;if(zxingReader){try{zxingReader.reset()}catch(e){}zxingReader=null}if(stream)stream.getTracks().forEach(t=>t.stop());if(video.srcObject){try{video.srcObject.getTracks().forEach(t=>t.stop())}catch(e){}}video.srcObject=null;stream=null;nativeDetector=null;start.disabled=false;stop.disabled=true;ocr.disabled=true;if(!ocrBusy)setStatus('Pronto')}
function clean(s){return(s||'').replace(/[|]/g,'I').replace(/\s+/g,' ').trim()}
function parseLabel(text){
 const lines=text.split(/\n+/).map(clean).filter(x=>x.length>2),all=lines.join('\n');
 const streetRx=/\b(rua|avenida|av\.?|travessa|alameda|rodovia|estrada|pra[cç]a)\b/i;
 const isHeader=l=>/^(destinat[aá]rio|remetente|corredor|gaiola|coleta|danfe|sku|nf\b|s[eé]rie\b|emiss[aã]o)/i.test(l);
 const dest=lines.findIndex(l=>/destinat[aá]rio/i.test(l)),rem=lines.findIndex(l=>/remetente/i.test(l));
 let recipient='—',address='—',district='—',city='—',cep='—',sender='—',senderCep='—';
 if(dest>=0){
  let block=[];for(let i=dest+1;i<Math.min(lines.length,dest+9);i++){if(i!==dest+1&&isHeader(lines[i]))break;block.push(lines[i])}
  recipient=block[0]||'—';
  const bi=block.findIndex(l=>/bairro\s*[:\-]?/i.test(l)),ci=block.findIndex(l=>/\b(?:SP|RJ|MG|ES|PR|SC|RS|BA|PE|CE|GO|DF|PA|AM|MT|MS|MA|PB|RN|AL|SE|PI|RO|RR|AC|AP|TO)\b/i.test(l));
  if(bi>=0)district=block[bi].replace(/.*bairro\s*[:\-]?/i,'').trim()||'—';
  const addrLines=block.slice(1,bi>=0?bi:(ci>=0?ci:block.length)).filter(l=>!/^cep\b/i.test(l)&&!/\b\d{2}\/\d{2}\/\d{4}\b/.test(l));
  if(addrLines.length)address=addrLines.join(', ');
  if(ci>=0)city=block[ci];
  const cm=block.join(' ').match(/(?:CEP\s*[:\-]?\s*)?(\d{5}[-.]?\d{3})\b/i);if(cm)cep=cm[1];
 }
 if(address==='—'){const ai=lines.findIndex(l=>streetRx.test(l));if(ai>=0)address=lines.slice(ai,ai+2).filter(l=>!/bairro|cep/i.test(l)).join(', ')}
 if(rem>=0){let block=[];for(let i=rem+1;i<Math.min(lines.length,rem+7);i++){if(i!==rem+1&&isHeader(lines[i]))break;block.push(lines[i])}sender=block[0]||'—';const cm=block.join(' ').match(/(?:CEP\s*[:\-]?\s*)?(\d{5}[-.]?\d{3})\b/i);if(cm)senderCep=cm[1]}
 const validCodes=[...foundCodes.keys()].filter(v=>/^[A-Z]{2}\d{9,14}[A-Z]{0,2}$/i.test(v.replace(/\s/g,'')));
 let tracking=validCodes[0]||'—';if(tracking==='—'){const tm=all.match(/\b[A-Z]{2}\d{9,14}[A-Z]{1,2}\b/i);if(tm)tracking=tm[0]}
 const nf=(all.match(/\bNF\s*[:#-]?\s*(\d{3,12})/i)||[])[1]||'—';
 const series=(all.match(/s[eé]rie\s*[:#-]?\s*([A-Z0-9.-]+)/i)||[])[1]||'—';
 const digitRuns=(all.match(/\b\d{30,50}\b/g)||[]).sort((a,b)=>b.length-a.length),danfe=digitRuns[0]||'—';
 const sku=(all.match(/\bSKU\s*[:#-]?\s*([^\n]+)/i)||[])[1]||'—';
 const issue=(all.match(/emiss[aã]o\s*[:#-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i)||[])[1]||'—';
 const forecast=(all.match(/envio\s+previsto\s*[:#-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i)||[])[1]||'—';
 return{recipient,address,district,city,cep,tracking,sender,senderCep,nf,series,danfe,sku,issue,forecast,raw:all}
}

function spatialRecipient(result){
 const ws=(result?.data?.words||[]).filter(w=>w?.bbox&&clean(w.text).length);
 if(!ws.length)return null;
 const marker=ws.find(w=>/destinat/i.test(w.text||''));if(!marker)return null;
 const my=(marker.bbox.y0+marker.bbox.y1)/2,mh=Math.max(10,marker.bbox.y1-marker.bbox.y0);
 let cand=ws.filter(w=>{const cy=(w.bbox.y0+w.bbox.y1)/2;return cy>my+mh*.45&&cy<my+mh*7.8});
 cand.sort((a,b)=>((a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1))||a.bbox.x0-b.bbox.x0);
 const rows=[];
 for(const w of cand){const cy=(w.bbox.y0+w.bbox.y1)/2;let r=rows.find(x=>Math.abs(x.y-cy)<Math.max(8,mh*.65));if(!r){r={y:cy,words:[]};rows.push(r)}r.words.push(w);r.y=(r.y*(r.words.length-1)+cy)/r.words.length}
 const lines=rows.sort((a,b)=>a.y-b.y).map(r=>clean(r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(w=>w.text).join(' '))).filter(Boolean);
 const stop=lines.findIndex(l=>/^(corredor|gaiola|coleta|remetente|danfe)/i.test(l));const b=(stop>=0?lines.slice(0,stop):lines).slice(0,7);
 if(!b.length)return null;
 const tidy=s=>clean(s).replace(/^[,.;:'"*_\-]+|[,.;:'"*_\-]+$/g,'').replace(/\s+([,.;])/g,'$1');
 let recipient=tidy(b[0])||'—';
 const bi=b.findIndex(l=>/bairro/i.test(l));let district='—';if(bi>=0)district=tidy(b[bi].replace(/.*bairro\s*[:\-]?/i,''));
 const addr=b.slice(1,bi>=0?bi:b.length).filter(l=>!/^(cep|bairro)/i.test(l));
 let address=tidy(addr.join(' '))||'—',city='—',cep='—';
 const cepm=b.join(' ').match(/\b(\d{5})[-.]?(\d{3})\b/);if(cepm)cep=cepm[1]+'-'+cepm[2];
 const citym=address.match(/(São\s+José\s+dos\s+Campos)(?:\s*[,\-]?\s*(?:São\s+Paulo|SP))?/i);if(citym){city=citym[1]+'/SP';address=tidy(address.slice(0,citym.index))}
 return{recipient,address,district,city,cep};
}

async function saveLocalCapture(blob){try{const db=await new Promise((ok,no)=>{const r=indexedDB.open('leitor-etiquetas',1);r.onupgradeneeded=()=>r.result.createObjectStore('capturas',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction('capturas','readwrite');tx.objectStore('capturas').put({id:Date.now(),createdAt:new Date().toISOString(),image:blob});return true}catch(e){console.warn('Falha ao salvar localmente',e);return false}}
async function readOCR(){if(ocrBusy||!video.videoWidth)return;ocrBusy=true;ocr.disabled=true;person.hidden=false;ocrState.textContent='CAPTURANDO';setStatus('Capturando foto');try{
 const max=2600,scale=Math.min(1,max/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,canvas.width,canvas.height);
 const blob=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',.94));snapshot.src=URL.createObjectURL(blob);snapshot.hidden=false;video.hidden=true;$('#captureInfo').hidden=false;$('#captureTime').textContent='Capturada em '+new Date().toLocaleString('pt-BR');await saveLocalCapture(blob);ocrState.textContent='LENDO...';setStatus('Localizando destinatário');
 const full=await Tesseract.recognize(canvas,'por',{logger:m=>{if(m.status==='recognizing text')ocrState.textContent=Math.round((m.progress||0)*45)+'%'}});
 let text=full.data.text||'',cropText='';
 const words=full.data.words||[];const marker=words.find(w=>/destinat/i.test(w.text||''));
 const crop=document.createElement('canvas');crop.width=canvas.width;
 let y0=0,h=Math.round(canvas.height*.38);
 if(marker&&marker.bbox){y0=Math.max(0,marker.bbox.y0-35);h=Math.min(canvas.height-y0,Math.max(320,canvas.height*.30))}
 crop.height=h;const cctx=crop.getContext('2d');cctx.drawImage(canvas,0,y0,canvas.width,h,0,0,canvas.width,h);
 const focused=await Tesseract.recognize(crop,'por',{logger:m=>{if(m.status==='recognizing text')ocrState.textContent=45+Math.round((m.progress||0)*55)+'%'}});
 cropText=focused.data.text||'';
 let p=parseLabel(cropText);const score=x=>[x.recipient,x.address,x.district,x.city,x.cep].filter(v=>v&&v!=='—').length;
 const fullParsed=parseLabel(text);if(score(fullParsed)>score(p))p=fullParsed;
 const spatial=spatialRecipient(full);if(spatial){const merged={...p};for(const k of ['recipient','address','district','city','cep'])if(spatial[k]&&spatial[k]!=='—')merged[k]=spatial[k];p=merged}
 $('#recipient').textContent=p.recipient;$('#address').textContent=p.address;$('#district').textContent=p.district;$('#city').textContent=p.city;$('#cep').textContent=p.cep;$('#rawText').textContent='LEITURA FOCADA:\n'+(cropText||'—')+'\n\nLEITURA COMPLETA:\n'+(text||'—');
 const found=[p.recipient,p.address,p.district,p.city,p.cep].filter(v=>v&&v!=='—').length;
 if(found){ocrState.textContent='CONCLUÍDO';setStatus('Destinatário lido')}else{ocrState.textContent='NÃO IDENTIFICADO';setStatus('Tente aproximar a etiqueta')}
 }catch(e){console.error(e);ocrState.textContent='ERRO';setStatus('Falha no OCR');$('#rawText').textContent='Não foi possível reconhecer o destinatário. Tente enquadrar a etiqueta inteira, com boa luz e a câmera reta.'}finally{ocrBusy=false;ocr.disabled=!running}}
start.onclick=async()=>{snapshot.hidden=true;video.hidden=false;await begin()};stop.onclick=end;ocr.onclick=readOCR;copy.onclick=async()=>{if(lastValue){await navigator.clipboard.writeText(lastValue);copy.textContent='Copiado';setTimeout(()=>copy.textContent='Copiar',1200)}};document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)end()});
// iOS: impede zoom por duplo toque, pinça e gestos de escala do Safari.
let lastTouchEnd=0;document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=now},{passive:false});document.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});['gesturestart','gesturechange','gestureend'].forEach(type=>document.addEventListener(type,e=>e.preventDefault(),{passive:false}));

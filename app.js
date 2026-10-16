const video=document.querySelector('#video'),start=document.querySelector('#start'),stop=document.querySelector('#stop'),statusEl=document.querySelector('#status'),empty=document.querySelector('#empty'),data=document.querySelector('#data'),formatEl=document.querySelector('#format'),valueEl=document.querySelector('#value'),timeEl=document.querySelector('#time'),copy=document.querySelector('#copy'),manualForm=document.querySelector('#manualForm'),manualValue=document.querySelector('#manualValue');
let stream=null,nativeDetector=null,zxingReader=null,running=false,lastValue='',lastAt=0,raf=0;
function setStatus(t){statusEl.textContent=t}
function showResult(value,format='código'){const now=Date.now();if(value===lastValue&&now-lastAt<2500)return;lastAt=now;lastValue=value;empty.hidden=true;data.hidden=false;formatEl.textContent=String(format).toUpperCase();valueEl.textContent=value;timeEl.textContent='Lido em '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});copy.disabled=false;if(navigator.vibrate)navigator.vibrate(80)}
async function begin(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('camera_unsupported');
  start.disabled=true;setStatus('Abrindo câmera');
  if('BarcodeDetector'in window){
   const supported=await BarcodeDetector.getSupportedFormats();nativeDetector=new BarcodeDetector({formats:supported});
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
   video.srcObject=stream;await video.play();running=true;stop.disabled=false;setStatus('Escaneando');nativeScan();return;
  }
  if(!window.ZXing)throw new Error('scanner_library_failed');
  zxingReader=new ZXing.BrowserMultiFormatReader();
  running=true;stop.disabled=false;setStatus('Escaneando');
  await zxingReader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}},video,(result,err)=>{
    if(!running)return;
    if(result){const fmt=result.getBarcodeFormat?ZXing.BarcodeFormat[result.getBarcodeFormat()]:'código';showResult(result.getText(),fmt)}
  });
 }catch(e){console.error(e);end();setStatus('Falha na câmera');alert(e?.name==='NotAllowedError'?'Permita o acesso à câmera no Safari e tente novamente.':'Não consegui iniciar o leitor. Atualize a página e tente novamente.')}
}
async function nativeScan(){if(!running)return;try{const codes=await nativeDetector.detect(video);if(codes.length){const c=codes[0];showResult(c.rawValue,c.format||'código')}}catch(e){}raf=requestAnimationFrame(nativeScan)}
function end(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;if(zxingReader){try{zxingReader.reset()}catch(e){}zxingReader=null}if(stream)stream.getTracks().forEach(t=>t.stop());if(video.srcObject){try{video.srcObject.getTracks().forEach(t=>t.stop())}catch(e){}}video.srcObject=null;stream=null;nativeDetector=null;start.disabled=false;stop.disabled=true;if(statusEl.textContent!=='Falha na câmera')setStatus('Pronto')}
start.addEventListener('click',begin);stop.addEventListener('click',end);copy.addEventListener('click',async()=>{if(lastValue){await navigator.clipboard.writeText(lastValue);copy.textContent='Copiado';setTimeout(()=>copy.textContent='Copiar',1200)}});manualForm.addEventListener('submit',e=>{e.preventDefault();const v=manualValue.value.trim();if(v){showResult(v,'manual');manualValue.value=''}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)end()});
import {calculate,formulae,FIELDS,runControls,todayWarsaw} from './calculator.mjs';
import {makeReport,formatDate} from './report.mjs';
import {buildPDF} from './pdf.mjs';
import {makeRelationReport,runPosagControls} from './lineage.mjs';
import {METHOD_CONFIG} from './method-config.mjs';

const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='soul-decoder-editor-v1';
let data,original,fontBytes,metrics,boldFontBytes,boldMetrics,currentProfile=null,currentReport=null,pdfURL=null,pdfResult=null,relationURL=null,currentProduct=null,people=[],nextId=0;
const showError=(id,error)=>{const el=$(id);el.textContent=error?.message||String(error);el.hidden=false;};
const getJSON=async path=>{const r=await fetch(path);if(!r.ok)throw new Error('Nie udało się wczytać plików strony. Odśwież ją i spróbuj ponownie.');return r.json();};
export function validateContent(value) {
  if(value?.schemaVersion!==1||!value.site||!Array.isArray(value.products)||value.products.length!==6)throw new Error('Plik nie zawiera sześciu ofert Soul Decoder.');
  if(new Set(value.products.map(x=>x.id)).size!==6)throw new Error('Powtórzone oznaczenia ofert.');
  for(const [key] of FIELDS){const s=value.report?.sections?.[key];if(!Array.isArray(s?.introduction))throw new Error(`Brak tekstu stałego: ${key}.`);for(let n=1;n<=22;n++)if(!Array.isArray(s.extended?.[n])||!s.extended[n].length)throw new Error(`Brak opisu: ${key} ${n}.`);}
  for(const group of ['0-6','7-15','16-21','22-39','40-59','60-79','80+'])for(let n=0;n<=22;n++)if(!Array.isArray(value.inheritance?.ageGroups?.[group]?.descriptions?.[n]?.paragraphs))throw new Error(`Brak posagu ${n} dla wieku ${group}.`);
  for(const p of value.products)if(p.naffyUrl&&!safeURL(p.naffyUrl))throw new Error('Link do oferty musi zaczynać się od https://.');
  for(const color of Object.values(value.site.theme||{}))if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Kolor musi mieć zapis #RRGGBB.');
  return value;
}
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function storeData(){validateContent(data);try{localStorage.setItem(STORAGE,JSON.stringify(data));$('editor-feedback').textContent='Zapisano w tej przeglądarce. Pobierz plik opisów, aby zachować zmiany w repozytorium.';}catch{$('editor-feedback').textContent='Zmiany działają w tej karcie. Pamięć przeglądarki jest niedostępna — pobierz plik opisów.';}renderOffers();invalidatePDF();invalidateRelation();}

const ART_FILES=['kod-duszy.png','partnerstwo.png','wiez.png','rodzenstwo.png','kronika-rodowa.png','alchemia-naczynia.png'];
function artwork(index,label) {
  return `<div class="art"><img class="tile-image" src="assets/graphics/${ART_FILES[index]}" alt="${escape(label)}" width="1122" height="1402" loading="lazy" decoding="async"></div>`;
}
const artLabels=['KOD DUSZY','PARTNERSTWO','WIĘŹ','RODZEŃSTWO','KRONIKA','ALCHEMIA'];
function renderOffers(){
  const theme=data.site.theme||{};for(const [key,variable]of [['accent','--purple'],['navy','--navy'],['gold','--gold'],['background','--page-bg']])if(theme[key])document.documentElement.style.setProperty(variable,theme[key]);
  $('site-headline').textContent=data.site.headline;$('site-intro').textContent=data.site.intro;
  $('offers').innerHTML=data.products.map((p,i)=>`<article class="offer"><a class="offer-link" href="${p.kind==='free'?'#osobisty':'#raport/'+escape(p.id)}" aria-label="${escape(p.title)}">${artwork(i,artLabels[i])}<h2>${escape(p.title)}</h2></a><p class="subtitle">${escape(p.subtitle)}</p><span class="offer-badge">${p.kind==='free'?'<span class="free">Raport bezpłatny</span>':p.status==='ready'&&p.naffyUrl?'Raport płatny':'Raport płatny • W przygotowaniu'}</span></article>`).join('');
}
function navigate(){
  const hash=location.hash.slice(1)||'oferty';let view='offers';
  if(hash==='osobisty')view='personal';else if(hash==='metodyka')view='method';else if(hash==='redakcja')view='editor';else if(hash.startsWith('raport/')){
    const p=data.products.find(p=>p.id===hash.split('/')[1]);if(p){currentProduct=p;view='product';renderProduct();}
  }
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`view-${view}`);
  if(view==='method')renderControls();if(view==='editor')loadEditor();
  document.title=view==='personal'?'Raport osobisty • Soul Decoder Estera':view==='product'?`${currentProduct.title} • Soul Decoder Estera`:'Soul Decoder Estera — Architektura Kodu Duszy';
  window.scrollTo({top:0,behavior:'instant'});
}
function renderProduct(){
  const p=currentProduct,i=data.products.findIndex(x=>x.id===p.id);$('product-art').innerHTML=artwork(i,artLabels[i]);
  $('product-kind').textContent='ROZSZERZENIE • RAPORT PŁATNY';$('product-title').textContent=p.title;$('product-subtitle').textContent=p.subtitle;$('product-description').textContent=p.description;
  const active=p.status==='ready'&&safeURL(p.naffyUrl);$('product-status').textContent=active?'Oferta dostępna w Naffy.':p.id==='alchemia'?'W przygotowaniu • Autorski skrypt procesu integracji.':'W przygotowaniu • Generator można sprawdzić w prywatnej pracowni.';
  $('naffy-link').hidden=!active;if(active)$('naffy-link').href=active;$('open-relation').hidden=p.id==='alchemia';$('relation-builder').hidden=true;$('relation-output').hidden=true;
}
function invalidatePDF(){if(pdfURL)URL.revokeObjectURL(pdfURL);pdfURL=null;pdfResult=null;$('pdf-preview').removeAttribute('src');$('download-button').disabled=true;$('pdf-status').textContent='Podgląd wymaga ponownego wygenerowania.';currentReport=null;}
function invalidateProfile(){currentProfile=null;invalidatePDF();$('result').hidden=true;$('empty-result').hidden=false;}
function statusChanged(){const deceased=$('person-status').value==='deceased';$('deceased-note').hidden=!deceased;$('calculate-button').disabled=deceased;invalidateProfile();}
function analyze(){
  $('form-error').hidden=true;
  try{
    const name=$('person-name').value.trim(),status=$('person-status').value,date=$('birth-date').value;
    if(!name)throw new Error('Wpisz imię.');if(status!=='living')throw new Error('Ten raport dotyczy osoby żyjącej. Wybierz odpowiedni status.');
    const p=calculate(date);currentProfile={name,date,p};invalidatePDF();
    currentReport=makeReport(name,date,p,data,data.report);$('result-title').textContent=`${name} • ${formatDate(date)}`;
    const formulas=formulae(date,p);
    $('metrics').innerHTML=FIELDS.map(([key,title])=>`<div class="metric"><span class="metric-label">${title}</span><strong class="metric-number">${p[key]}</strong><span class="metric-letter" aria-label="${escape(METHOD_CONFIG.letters[key][p[key]].name)}">${escape(METHOD_CONFIG.letters[key][p[key]].symbol)}</span></div>`).join('');
    $('steps').innerHTML=FIELDS.map(([key,title],i)=>`<li><span class="step-index">${i+1}</span><div><h3>${title}</h3><p>${escape(formulas[key])}</p></div><strong class="step-value">${p[key]}</strong></li>`).join('');
    $('empty-result').hidden=true;$('result').hidden=false;setTab('steps');
  }catch(e){showError('form-error',e);invalidateProfile();}
}
function setTab(tab){for(const x of ['steps','report']){$(`${x}-panel`).hidden=x!==tab;$(`${x}-tab`).classList.toggle('active',x===tab);$(`${x}-tab`).setAttribute('aria-selected',String(x===tab));$(`${x}-tab`).tabIndex=x===tab?0:-1;}}
const readingParagraphs=items=>items.map(s=>`<p${s.length<95&&!/[.!?]$/.test(s)?' class="reading-subhead"':''}>${escape(s)}</p>`).join('');
function reading(report){
  const heading=`<h2>${escape(report.title||'Kod Architektury Duszy')}</h2><p>${escape(report.name)} • ${formatDate(report.date)}</p>`;
  if(report.chapters)return heading+report.chapters.map(c=>`<h2>${escape(c.title)}</h2>${readingParagraphs(c.paragraphs)}`).join('');
  return heading+`<p>${escape(report.quote)}</p><h2>Architektura Duszy</h2>${readingParagraphs(report.introduction)}`+report.sections.map(s=>`<h2>${escape(s.title)}</h2>${readingParagraphs(s.introduction)}<p class="reading-formula"><strong>${s.value} · ${escape(s.letter)} · ${escape(s.letterName)}</strong><br>${escape(s.formula)}</p>${readingParagraphs(s.interpretation)}`).join('')+`<h2>Synteza Architektury Duszy</h2>${readingParagraphs(report.synthesis)}`;
}
async function previewReport(){
  if(!currentProfile)return;
  setTab('report');$('pdf-status').textContent='Przygotowywanie raportu…';
  try{
    const {name,date,p}=currentProfile;currentReport=makeReport(name,date,p,data,data.report);
    $('report-reading').innerHTML=reading(currentReport);
    if(!pdfResult){pdfResult=buildPDF(currentReport,fontBytes,metrics,{bytes:boldFontBytes,metrics:boldMetrics});pdfURL=URL.createObjectURL(new Blob([pdfResult.bytes],{type:'application/pdf'}));}
    $('pdf-preview').src=pdfURL;$('pdf-status').textContent=`${pdfResult.pageCount} stron • Raport z aktualnych danych i opisów`;$('download-button').disabled=false;
  }catch(e){showError('form-error',e);$('pdf-status').textContent='Raport nie został wygenerowany.';}
}
function renderControls(){const result=runControls(),ok=result.filter(x=>x.ok).length;$('control-status').textContent=`${ok} / ${result.length} zgodnych`;$('controls').innerHTML=result.map(c=>`<button class="control ${c.ok?'':'failed'}" type="button" data-case="${c.date}"><span class="check">${c.ok?'✓ Zgodny':'✕ Rozbieżność'}</span><strong>${escape(c.label)}</strong><p>${formatDate(c.date)} • ${escape(c.why)}</p><code>Oczekiwane: ${c.expected.join(' / ')}<br>Otrzymane: ${c.actual.join(' / ')}</code></button>`).join('');$('posag-controls').innerHTML=runPosagControls().map(c=>`<div class="control ${c.ok?'':'failed'}"><span class="check">${c.ok?'✓ Zgodny':'✕ Rozbieżność'}</span><strong>${escape(c.label)}</strong><p>${formatDate(c.birth)} → ${formatDate(c.death)}</p><code>Oczekiwane: ${c.expected.map(n=>n===null?'brak warunku':n).join(' / ')}<br>Otrzymane: ${c.actual.map(n=>n===null?'brak warunku':n).join(' / ')}</code></div>`).join('');}
function example(date='1974-11-06'){$('person-name').value=date==='1974-11-06'?'Emilia':'Przypadek kontrolny';$('person-status').value='living';$('birth-date').value=date;statusChanged();location.hash='osobisty';analyze();}

function editorTarget(){
  const area=$('editor-area').value,key=$('editor-section').value,type=$('editor-type').value,n=$('editor-number').value;
  if(area==='inheritance'){const group=$('editor-age').value,value=$('editor-age-number').value;return {area,group,value,title:group==='sameDay'?'Odejście w dniu narodzin':`Posag ${value} • ${group} lat`,paragraphs:group==='sameDay'?data.inheritance.sameDayIntroduction:data.inheritance.ageGroups[group].descriptions[value].paragraphs};}
  if(area!=='report')return {area};
  if(['introduction','synthesis','quote'].includes(key))return {area,key,title:$('editor-section').selectedOptions[0].textContent,paragraphs:key==='quote'?[data.report.quote]:data.report[key]};
  const s=data.report.sections[key],variant=key==='Tikkun'?$('tikkun-variant').value:null;return {area,key,type,n,variant,title:`${FIELDS.find(([k])=>k===key)[1]} • ${type==='introduction'?'tekst stały':`wibracja ${n}`}`,paragraphs:type==='introduction'?s.introduction:variant?s.variants[variant].extended[n]:s.extended[n],letter:METHOD_CONFIG.letters[key][n],source:s.source};
}
function loadEditor(){
  const t=editorTarget();$('report-selectors').hidden=t.area!=='report';$('age-selectors').hidden=t.area!=='inheritance';$('offer-selectors').hidden=t.area!=='offers';$('text-editor').hidden=!['report','inheritance'].includes(t.area);$('offer-editor').hidden=t.area!=='offers';$('site-editor').hidden=t.area!=='site';$('editor-feedback').textContent='';
  if(t.area==='offers'){const p=data.products.find(x=>x.id===$('editor-offer').value);$('editor-title').textContent='Kafelek • '+p.title;for(const [id,key]of [['offer-title','title'],['offer-subtitle','subtitle'],['offer-description','description'],['offer-url','naffyUrl'],['offer-status','status']])$(id).value=p[key];$('editor-source').textContent='Nazwy, treści i linki są niezależne od obliczeń.';return;}
  if(t.area==='site'){$('editor-title').textContent='Teksty i wygląd strony';$('site-title-input').value=data.site.headline;$('site-intro-input').value=data.site.intro;for(const key of ['accent','navy','gold','background'])$(`theme-${key}`).value=data.site.theme?.[key]||'#ffffff';$('editor-source').textContent='Kolory i treści strony nie zmieniają obliczeń ani zasad interpretacji.';return;}
  $('editor-title').textContent=t.title;$('editor-text').value=t.paragraphs.join('\n\n');$('editor-source').textContent=t.source?`Źródło: ${t.source}`:t.area==='inheritance'?'Słownik posagu dobrany według wieku; zero jest odrębnym wpisem.':'Tekst ramowy raportu.';
  const section=FIELDS.some(([k])=>k===t.key);$('editor-type-wrap').hidden=!section;$('editor-number-wrap').hidden=!section||t.type!=='extended';$('variant-wrap').hidden=t.key!=='Tikkun';$('letter-editor').hidden=!section||t.type!=='extended';
  if(section&&t.type==='extended'){$('editor-letter-name').value=t.letter.name;$('editor-letter-symbol').value=t.letter.symbol;}
  $('editor-age-number').disabled=t.group==='sameDay';
}
function saveEditor(){
  try{
    const t=editorTarget(),text=$('editor-text').value.trim(),ps=text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    if(['report','inheritance'].includes(t.area)&&!ps.length)throw new Error('Opis nie może być pusty.');
    if(t.area==='offers'){const p=data.products.find(x=>x.id===$('editor-offer').value);const title=$('offer-title').value.trim(),url=$('offer-url').value.trim();if(!title)throw new Error('Nazwa oferty nie może być pusta.');if(url&&!safeURL(url))throw new Error('Podaj pełny adres https://.');Object.assign(p,{title,subtitle:$('offer-subtitle').value.trim(),description:$('offer-description').value.trim(),naffyUrl:url,status:p.kind==='free'?'ready':$('offer-status').value});}
    else if(t.area==='site'){if(!$('site-title-input').value.trim())throw new Error('Nagłówek nie może być pusty.');data.site.headline=$('site-title-input').value.trim();data.site.intro=$('site-intro-input').value.trim();data.site.theme=Object.fromEntries(['accent','navy','gold','background'].map(key=>[key,$(`theme-${key}`).value]));}
    else if(t.area==='inheritance'){if(t.group==='sameDay')data.inheritance.sameDayIntroduction=ps;else data.inheritance.ageGroups[t.group].descriptions[t.value].paragraphs=ps;}
    else if(['introduction','synthesis','quote'].includes(t.key))data.report[t.key]=t.key==='quote'?text:ps;
    else {const s=data.report.sections[t.key];if(t.type==='introduction')s.introduction=ps;else if(t.variant){s.variants[t.variant].extended[t.n]=ps;if(t.variant===METHOD_CONFIG.tikkunVariant)s.extended[t.n]=ps;}else s.extended[t.n]=ps;}
    storeData();if(currentProfile)analyze();
  }catch(e){$('editor-feedback').textContent=e.message;}
}

function newPerson(relation='',defaults={}){return {id:`p${nextId++}`,name:'',birth:'',status:'living',death:'',relation,motherId:'',fatherId:'',...defaults};}
function renderPeople(){
  const tree=currentProduct.id==='kronika';$('add-person').hidden=['partnerski','rodzic-dziecko'].includes(currentProduct.id)||people.length>=15;
  $('relation-people').innerHTML=people.map((p,i)=>`<fieldset class="person-card ${p.status==='deceased'?'is-deceased':''}" data-id="${p.id}"><legend>${i===0?'Profil główny':`Osoba ${i+1}`}</legend><div class="person-head"><h3>${escape(p.relation||`Osoba ${i+1}`)}</h3>${i>1&&!tree?`<button class="relation-remove" type="button" data-remove="${p.id}">Usuń osobę</button>`:''}</div><div class="person-fields"><div><label for="${p.id}-name">Imię *</label><input id="${p.id}-name" data-field="name" maxlength="80" required value="${escape(p.name)}"></div><div><label for="${p.id}-birth">Data urodzenia *</label><input id="${p.id}-birth" data-field="birth" type="date" max="${todayWarsaw()}" required value="${p.birth}"></div><div><label for="${p.id}-status">Status osoby *</label><select id="${p.id}-status" data-field="status"><option value="living" ${p.status==='living'?'selected':''}>Osoba żyjąca</option><option value="deceased" ${p.status==='deceased'?'selected':''}>Osoba nieżyjąca</option></select></div><div class="death-field"><label for="${p.id}-death">Data odejścia *</label><input id="${p.id}-death" data-field="death" type="date" max="${todayWarsaw()}" ${p.status==='deceased'?'required':'disabled'} value="${p.death}"></div><div><label for="${p.id}-relation">Relacja / oznaczenie</label><input id="${p.id}-relation" data-field="relation" value="${escape(p.relation)}"></div>${tree?`<div class="parent-selectors">${[['motherId','Matka'],['fatherId','Ojciec']].map(([key,title])=>`<div><label for="${p.id}-${key}">${title}</label><select id="${p.id}-${key}" data-field="${key}"><option value="">Nie wskazano</option>${people.filter(q=>q.id!==p.id).map((q,j)=>`<option value="${q.id}" ${p[key]===q.id?'selected':''}>${escape(q.name||q.relation||q.id)}</option>`).join('')}</select></div>`).join('')}</div>`:''}</div></fieldset>`).join('');
}
function openRelation(){nextId=0;const kind=currentProduct.id;
  if(kind==='kronika'){
    people=['Osoba główna','Matka','Ojciec','Babcia — linia matki','Dziadek — linia matki','Babcia — linia ojca','Dziadek — linia ojca'].map(label=>newPerson(label));
    people[0].motherId=people[1].id;people[0].fatherId=people[2].id;people[1].motherId=people[3].id;people[1].fatherId=people[4].id;people[2].motherId=people[5].id;people[2].fatherId=people[6].id;
  }else people=kind==='partnerski'?[newPerson('Partner / partnerka'),newPerson('Partner / partnerka')]:kind==='rodzic-dziecko'?[newPerson('Rodzic'),newPerson('Dziecko')]:[newPerson('Siostra / brat'),newPerson('Siostra / brat')];
  $('relation-title').textContent=currentProduct.title+' • Osoby w analizie';$('relation-builder').hidden=false;renderPeople();$('relation-builder').scrollIntoView({behavior:'smooth',block:'start'});
}
function invalidateRelation(){if(relationURL)URL.revokeObjectURL(relationURL);relationURL=null;$('relation-output').hidden=true;$('relation-pdf').removeAttribute('src');}
function generateRelation(){
  $('relation-error').hidden=true;invalidateRelation();
  try{const report=makeRelationReport(currentProduct,people,data),pdf=buildPDF(report,fontBytes,metrics,{bytes:boldFontBytes,metrics:boldMetrics});relationURL=URL.createObjectURL(new Blob([pdf.bytes],{type:'application/pdf'}));$('relation-reading').innerHTML=reading(report);$('relation-pdf').src=relationURL;$('relation-pdf-status').textContent=`${pdf.pageCount} stron • Prywatny podgląd analizy`;$('relation-output').hidden=false;$('relation-download').onclick=()=>downloadBlob(new Blob([pdf.bytes],{type:'application/pdf'}),`Soul_Decoder_${currentProduct.id}.pdf`);$('relation-output').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){showError('relation-error',e);}
}

async function init(){
  try{
    const getFont=path=>fetch(path).then(r=>{if(!r.ok)throw new Error('Brak fontu PDF.');return r.arrayBuffer();});
    const [source,font,rules,boldFont,boldRules]=await Promise.all([getJSON('assets/report-content.json'),getFont('assets/report-font.ttf'),getJSON('assets/font-metrics.json'),getFont('assets/report-font-bold.ttf'),getJSON('assets/font-bold-metrics.json')]);
    original=validateContent(source);data=structuredClone(original);fontBytes=new Uint8Array(font);metrics=rules;boldFontBytes=new Uint8Array(boldFont);boldMetrics=boldRules;
    try{const saved=localStorage.getItem(STORAGE);if(saved)data=validateContent(JSON.parse(saved));}catch{/* Źródłowe treści działają także bez pamięci lokalnej. */}
    $('birth-date').max=todayWarsaw();
    $('editor-number').innerHTML=Array.from({length:22},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');$('editor-age-number').innerHTML=Array.from({length:23},(_,i)=>`<option value="${i}">${i}${i===0?' • Ain Soph':''}</option>`).join('');$('editor-offer').innerHTML=data.products.map(p=>`<option value="${p.id}">${escape(p.title)}</option>`).join('');
    renderOffers();navigate();window.addEventListener('hashchange',navigate);
    $('profile-form').addEventListener('submit',e=>{e.preventDefault();analyze();});
    for(const id of ['person-name','birth-date'])$(id).addEventListener('input',invalidateProfile);$('person-status').addEventListener('change',statusChanged);
    $('example-button').onclick=()=>example();$('steps-tab').onclick=()=>setTab('steps');$('report-tab').onclick=previewReport;$('preview-button').onclick=previewReport;
    for(const id of ['steps-tab','report-tab'])$(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const target=id==='steps-tab'?'report-tab':'steps-tab';$(target).focus();$(target).click();}});
    $('download-button').onclick=()=>{if(pdfResult)downloadBlob(new Blob([pdfResult.bytes],{type:'application/pdf'}),`Soul_Decoder_${currentProfile.date}.pdf`);};
    $('rerun-controls').onclick=renderControls;$('controls').addEventListener('click',e=>{const c=e.target.closest('[data-case]');if(c)example(c.dataset.case);});
    for(const id of ['editor-area','editor-section','editor-type','editor-number','editor-offer','editor-age','editor-age-number'])$(id).addEventListener('change',loadEditor);
    $('tikkun-variant').addEventListener('change',loadEditor);
    $('save-description').onclick=saveEditor;$('export-content').onclick=()=>downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'report-content.json');
    $('import-content').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5_000_000)throw new Error('Plik jest za duży.');const imported=validateContent(JSON.parse(await file.text()));data=imported;storeData();loadEditor();$('editor-feedback').textContent='Wczytano plik. Zmiany są zapisane w tej przeglądarce.';}catch(err){$('editor-feedback').textContent=err.message;}finally{e.target.value='';}});
    $('reset-content').onclick=()=>{if(!window.confirm('Przywrócić wszystkie opisy źródłowe? Zmiany w tej przeglądarce zostaną zastąpione.'))return;data=structuredClone(original);storeData();loadEditor();$('editor-feedback').textContent='Przywrócono opisy źródłowe.';};
    $('open-relation').onclick=openRelation;$('add-person').onclick=()=>{if(people.length<15){people.push(newPerson('Krewny / krewna'));renderPeople();invalidateRelation();}};
    $('relation-people').addEventListener('input',e=>{const card=e.target.closest('[data-id]'),field=e.target.dataset.field;if(card&&field){const p=people.find(x=>x.id===card.dataset.id);p[field]=e.target.value;invalidateRelation();}});
    $('relation-people').addEventListener('change',e=>{const field=e.target.dataset.field;if(field){const p=people.find(x=>x.id===e.target.closest('[data-id]').dataset.id);p[field]=e.target.value;if(field==='status'){if(p.status==='living')p.death='';renderPeople();}else if(field==='name'){document.querySelectorAll('.parent-selectors option').forEach(option=>{const person=people.find(x=>x.id===option.value);if(person)option.textContent=person.name||person.relation||person.id;});}invalidateRelation();}});
    $('relation-people').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove){people=people.filter(p=>p.id!==remove.dataset.remove);renderPeople();invalidateRelation();}});
    $('relation-form').addEventListener('submit',e=>{e.preventDefault();generateRelation();});
  }catch(e){showError('global-error',e);}
}
if(typeof document!=='undefined')init();

// A brief gold response precedes the ordinary card navigation.
let pendingCardNavigation=null;
if(typeof document!=='undefined')document.addEventListener('click',event=>{
  const link=event.target.closest('.offer-link');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  event.preventDefault();clearTimeout(pendingCardNavigation);
  document.querySelectorAll('.art.is-activated').forEach(el=>el.classList.remove('is-activated'));
  const art=link.querySelector('.art');art.classList.add('is-activated');
  for(let i=0;i<12;i++){
    const dot=document.createElement('i');dot.className='gold-particle';dot.setAttribute('aria-hidden','true');
    const angle=i*2.399963,radius=32+i%6*10;
    dot.style.cssText=`--dx:${Math.cos(angle)*radius}px;--dy:${Math.sin(angle)*radius-35}px;left:${16+(i*37)%70}%;top:${25+(i*23)%55}%;animation-delay:${i%4*20}ms`;
    art.append(dot);setTimeout(()=>dot.remove(),900);
  }
  pendingCardNavigation=setTimeout(()=>{art.classList.remove('is-activated');location.hash=link.getAttribute('href');},760);
});

import {registerOrder,installCustomerAccount} from './customer.mjs';
import {calculate,formulae,FIELDS,runControls,todayWarsaw} from './calculator.mjs';
import {makeReport,formatDate} from './report.mjs';
import {buildPDF} from './pdf.mjs';
import {makeRelationReport,runPosagControls} from './lineage.mjs';
import {METHOD_CONFIG} from './method-config.mjs';

const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

const ART_FILES=['kod-duszy.png','partnerstwo.png','wiez.png','rodzenstwo.png','kronika-rodowa.png','alchemia-naczynia.png'];
function artwork(index,label) {
  return `<div class="art"><img class="tile-image" src="assets/graphics/${ART_FILES[index]}" alt="${escape(label)}" width="1122" height="1402" loading="lazy" decoding="async"></div>`;
}
const artLabels=['KOD DUSZY','PARTNERSTWO','WIĘŹ','RODZEŃSTWO','KRONIKA','ALCHEMIA'];
function renderOffers(){
  const theme=data.site.theme||{};for(const [key,variable]of [['accent','--purple'],['navy','--navy'],['gold','--gold'],['background','--page-bg']])if(theme[key])document.documentElement.style.setProperty(variable,theme[key]);
  const company=data.site.company||{};const complete=['name','nip','regon','street','postalCode','city'].every(key=>String(company[key]||'').trim());$('company-details').hidden=!complete;if(complete)$('company-content').innerHTML=`<p><strong>${escape(company.name)}</strong></p><p>${escape(company.street)}<br>${escape(company.postalCode)} ${escape(company.city)}</p><p>NIP: ${escape(company.nip)}<br>REGON: ${escape(company.regon)}</p>`;
  const letter=data.site.estera;if(letter){$('estera-title').textContent=letter.title||'Pracownia Estery';$('estera-letter').innerHTML=readingParagraphs(letter.paragraphs||[]);const url=safeURL(letter.photoUrl);$('estera-photo').hidden=!url;if(url){$('estera-photo').src=url;$('estera-photo').alt=letter.photoAlt||'Pracownia Estery';}}
  $('site-headline').textContent=data.site.headline;$('site-intro').textContent=data.site.intro;
  $('offers').innerHTML=data.products.map((p,i)=>`<article class="offer"><a class="offer-link" href="${p.kind==='free'?'#osobisty':'#raport/'+escape(p.id)}" aria-label="${escape(p.title)}">${artwork(i,artLabels[i])}<h2>${escape(p.title)}</h2></a><p class="subtitle">${escape(p.subtitle)}</p><span class="offer-badge">${p.id==='alchemia'?'W przygotowaniu':'<span class="free">Raport bezpłatny • Wersja testowa</span>'}</span></article>`).join('');
}
function navigate(){
  const hash=location.hash.slice(1)||'oferty';let view='offers';
  if(hash==='osobisty')view='personal';else if(hash==='kontakt')view='contact';else if(hash==='estera')view='estera';else if(hash==='zawartosc')view='about';else if(hash==='metodyka')view='method';else if(hash.startsWith('raport/')){
    const p=data.products.find(p=>p.id===hash.split('/')[1]);if(p){currentProduct=p;view='product';renderProduct();}
  }
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`view-${view}`);
  document.title=view==='personal'?'Raport osobisty • Soul Decoder Estera':view==='product'?`${currentProduct.title} • Soul Decoder Estera`:'Soul Decoder Estera — Architektura Kodu Duszy';
  window.scrollTo({top:0,behavior:'instant'});
  if(view==='product'&&currentProduct.id!=='alchemia')openRelation();
}
function renderProduct(){
  const p=currentProduct,i=data.products.findIndex(x=>x.id===p.id);$('product-art').innerHTML=artwork(i,artLabels[i]);
  $('product-kind').textContent=p.id==='alchemia'?'W PRZYGOTOWANIU':'RAPORT BEZPŁATNY • WERSJA TESTOWA';$('product-title').textContent=p.title;$('product-subtitle').textContent=p.subtitle;$('product-description').textContent=p.description;
  $('product-status').textContent=p.id==='alchemia'?'Generator Alchemii Naczynia nie jest jeszcze gotowy.':'Dostęp bez opłat i bez zakupu w Naffy.';
  $('naffy-link').hidden=true;$('naffy-link').removeAttribute('href');$('open-relation').hidden=p.id==='alchemia';$('relation-builder').hidden=true;$('relation-output').hidden=true;
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
  if(report.numericOnly)return heading+readingParagraphs(report.introduction)+report.sections.map(s=>`<h2>${escape(s.title)}</h2><p>${escape(s.formula)}</p>${readingParagraphs(s.interpretation)}`).join('');
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
  $('relation-title').textContent=currentProduct.title+' • Osoby w analizie';
  $('relation-builder').hidden=false;renderPeople();$('relation-builder').scrollIntoView({behavior:'smooth',block:'start'});
}
function invalidateRelation(){if(relationURL)URL.revokeObjectURL(relationURL);relationURL=null;$('relation-output').hidden=true;$('relation-pdf').removeAttribute('src');}
async function generateRelation(){
  $('relation-error').hidden=true;invalidateRelation();
  const button=$('relation-form').querySelector('[type="submit"]');button.disabled=true;
  try{const report=makeRelationReport(currentProduct,people,data);const order=await registerOrder(report,structuredClone(people),currentProduct.id);showRegisteredReport(report,order);}catch(e){showError('relation-error',e);}finally{button.disabled=false;}
}
function showRegisteredReport(report,order){
  const pdf=buildPDF({...report,orderNumber:order.order_number},fontBytes,metrics,{bytes:boldFontBytes,metrics:boldMetrics});
  if(relationURL)URL.revokeObjectURL(relationURL);relationURL=URL.createObjectURL(new Blob([pdf.bytes],{type:'application/pdf'}));
  $('relation-reading').innerHTML=reading(report);$('relation-pdf').src=relationURL;
  $('relation-pdf-status').textContent=`${order.order_number} • ${pdf.pageCount} stron • Test bezpłatny. Prośba o wysyłkę zapisana; raport nie został wysłany.`;
  $('relation-output').hidden=false;
  let printLink=$('order-print');if(!printLink){printLink=document.createElement('a');printLink.id='order-print';printLink.className='button outline small';printLink.target='_blank';printLink.rel='noopener';printLink.textContent='Otwórz PDF do wydruku';$('relation-download').after(printLink);}printLink.href=relationURL;
  $('relation-download').onclick=()=>downloadBlob(new Blob([pdf.bytes],{type:'application/pdf'}),`${order.order_number}.pdf`);
  $('relation-output').scrollIntoView({behavior:'smooth',block:'start'});
}

function setupRelationUI(){
  $('view-product').insertAdjacentHTML('beforeend','<div id="relation-builder" hidden><h2 id="relation-title">Osoby w analizie</h2><p class="notice">Bezpłatna wersja testowa. Wpisz dane osób, oblicz wartości i pobierz raport PDF. Aby otrzymać raport, zalogujesz się i zapiszesz zamówienie w bazie.</p><form id="relation-form" novalidate><div id="relation-people"></div><div class="relation-actions"><button id="add-person" class="button outline" type="button">Dodaj osobę +</button><button class="button primary" type="submit">Wygeneruj podgląd analizy →</button></div><p id="relation-error" class="error" role="alert" hidden></p></form><div id="relation-output" hidden><div class="report-toolbar"><span id="relation-pdf-status" role="status"></span><button id="relation-download" class="button primary small" type="button">Pobierz PDF ↓</button></div><div id="relation-reading" class="report-reading"></div><details class="pdf-details"><summary>Podgląd pliku PDF</summary><iframe id="relation-pdf" title="Podgląd PDF analizy relacji"></iframe></details></div></div>');
  const restart=document.createElement('button');restart.id='open-relation';restart.type='button';restart.className='button outline';restart.textContent='Rozpocznij nową analizę';$('product-status').after(restart);
    $('open-relation').onclick=openRelation;$('add-person').onclick=()=>{if(people.length<15){people.push(newPerson('Krewny / krewna'));renderPeople();invalidateRelation();}};
    $('relation-people').addEventListener('input',e=>{const card=e.target.closest('[data-id]'),field=e.target.dataset.field;if(card&&field){const p=people.find(x=>x.id===card.dataset.id);p[field]=e.target.value;invalidateRelation();}});
    $('relation-people').addEventListener('change',e=>{const field=e.target.dataset.field;if(field){const p=people.find(x=>x.id===e.target.closest('[data-id]').dataset.id);p[field]=e.target.value;if(field==='status'){if(p.status==='living')p.death='';renderPeople();}else if(field==='name'){document.querySelectorAll('.parent-selectors option').forEach(option=>{const person=people.find(x=>x.id===option.value);if(person)option.textContent=person.name||person.relation||person.id;});}invalidateRelation();}});
    $('relation-people').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove){people=people.filter(p=>p.id!==remove.dataset.remove);renderPeople();invalidateRelation();}});
    $('relation-form').addEventListener('submit',e=>{e.preventDefault();generateRelation();});
}

async function init(){
  try{
    const getFont=path=>fetch(path).then(r=>{if(!r.ok)throw new Error('Brak fontu PDF.');return r.arrayBuffer();});
    const [source,font,rules,boldFont,boldRules]=await Promise.all([getJSON('assets/report-content.json'),getFont('assets/report-font.ttf'),getJSON('assets/font-metrics.json'),getFont('assets/report-font-bold.ttf'),getJSON('assets/font-bold-metrics.json')]);
    original=validateContent(source);data=structuredClone(original);fontBytes=new Uint8Array(font);metrics=rules;boldFontBytes=new Uint8Array(boldFont);boldMetrics=boldRules;
    const methodView=$('view-method');if(methodView)methodView.innerHTML='<a class="back" href="#oferty">← Wszystkie raporty</a><h1>Jak liczymy</h1><p>Dzień i miesiąc zachowujemy do 22. Rok: suma cyfr, redukowana tylko gdy przekracza 22. Sumujemy trzy składowe i redukujemy do 22.</p><p>Węzeł oporu: składowe sortujemy malejąco; największa − środkowa − najmniejsza. W tym projekcie wynik ujemny zamieniamy na wartość bezwzględną, końcowe zero na 22. Zero pośrednie pozostaje zerem.</p><p>Przykład 14.03.1990: 14, 3, 19; osobowość 14 + 3 + 19 = 36 → 9; różnica pośrednia 19 − 14 = 5; Tikkun 5 − 3 = 2.</p><p>Wynik wskazuje pozycję litery w alfabecie (1–22). Gematria standardowa jest osobną wartością. Przypisania tematyczne: Sefer Jecira, redakcja Gra. Obliczanie profilu z daty jest zasadą projektu.</p>';
    $('birth-date').max=todayWarsaw();
    $('email-request').onchange=()=>{$('email-options').hidden=!$('email-request').checked;};
    $('contact-form').addEventListener('submit',e=>e.preventDefault());
    setupRelationUI();installCustomerAccount((report,order)=>{window.history.replaceState(null,"","#raport/"+order.product_id);currentProduct=data.products.find(p=>p.id===order.product_id);navigate();showRegisteredReport(report,order);});renderOffers();navigate();window.addEventListener('hashchange',navigate);
    $('profile-form').addEventListener('submit',e=>{e.preventDefault();analyze();});
    for(const id of ['person-name','birth-date'])$(id).addEventListener('input',invalidateProfile);$('person-status').addEventListener('change',statusChanged);
    $('steps-tab').onclick=()=>setTab('steps');$('report-tab').onclick=previewReport;$('preview-button').onclick=previewReport;
    for(const id of ['steps-tab','report-tab'])$(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const target=id==='steps-tab'?'report-tab':'steps-tab';$(target).focus();$(target).click();}});
    $('download-button').onclick=()=>{if(pdfResult)downloadBlob(new Blob([pdfResult.bytes],{type:'application/pdf'}),`Soul_Decoder_${currentProfile.date}.pdf`);};
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
  const rect=art.getBoundingClientRect();const keyboard=event.detail===0;
  const x=keyboard?rect.width/2:Math.max(0,Math.min(rect.width,event.clientX-rect.left));
  const y=keyboard?rect.height/2:Math.max(0,Math.min(rect.height,event.clientY-rect.top));
  for(let i=0;i<3;i++){const ripple=document.createElement('i');ripple.className='water-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.cssText=`left:${x}px;top:${y}px;animation-delay:${i*110}ms`;art.append(ripple);setTimeout(()=>ripple.remove(),1400);}

  for(let i=0;i<12;i++){
    const dot=document.createElement('i');dot.className='gold-particle';dot.setAttribute('aria-hidden','true');
    const angle=i*2.399963,radius=32+i%6*10;
    dot.style.cssText=`--dx:${Math.cos(angle)*radius}px;--dy:${Math.sin(angle)*radius-35}px;left:${16+(i*37)%70}%;top:${25+(i*23)%55}%;animation-delay:${i%4*20}ms`;
    art.append(dot);setTimeout(()=>dot.remove(),900);
  }
  pendingCardNavigation=setTimeout(()=>{art.classList.remove('is-activated');location.hash=link.getAttribute('href');},950);
});

import {calculate,profile,parseDate,sumDigits,reduce22,FIELDS} from './calculator.mjs';
import {formatDate,LETTERS} from './report.mjs';
import {METHOD_CONFIG} from './method-config.mjs';
const reduceKeepZero=n=>n===0?0:reduce22(n);
const reduce9=n=>{while(n>9)n=sumDigits(n);return n;};
export function posagMethods(birth,death) {
  const b=parseDate(birth),d=parseDate(death);
  if(death<birth)throw new Error('Data odejścia poprzedza narodziny.');
  const born=reduce9(sumDigits(b.d)+sumDigits(b.m)+sumDigits(b.r));
  const died=reduce9(sumDigits(d.d)+sumDigits(d.m)+sumDigits(d.r));
  const difference=Math.abs(born-died);
  const personalYear=reduce9(sumDigits(b.d)+sumDigits(b.m)+sumDigits(d.r));
  const deathDayMonth=reduce9(sumDigits(d.d)+sumDigits(d.m));
  const portal=personalYear===9&&deathDayMonth===9;
  return {born,died,difference,personalYear,deathDayMonth,method1:difference,method2:portal?0:null};
}
export const POSAG_CONTROLS=[
  {birth:'1970-05-12',death:'2016-08-24',label:'Korekta przykładu z tekstu',expected:[7,5,2,8,5,null]},
  {birth:'1980-09-27',death:'2016-09-27',label:'Obie metody dają zero',expected:[9,9,0,9,9,0]},
  {birth:'1990-09-27',death:'2016-09-27',label:'Zero tylko w metodzie 2',expected:[1,9,8,9,9,0]},
  {birth:'1930-03-02',death:'2016-03-06',label:'Posag zero u osoby starszej',expected:[9,9,0,5,9,null]},
  {birth:'2000-02-01',death:'2000-02-01',label:'Narodziny i odejście w tej samej dacie',expected:[5,5,0,5,3,null]}
];
export function runPosagControls(){return POSAG_CONTROLS.map(c=>{const p=posagMethods(c.birth,c.death),actual=[p.born,p.died,p.difference,p.personalYear,p.deathDayMonth,p.method2];return {...c,actual,ok:actual.every((n,i)=>n===c.expected[i])};});}
export function inheritance(birth,death) {
  const b=parseDate(birth),d=parseDate(death);
  if(death<birth)throw new Error('Data odejścia nie może być wcześniejsza niż data urodzenia.');
  const day=reduce22(d.d),month=d.m,yearSum=sumDigits(d.r),year=reduce22(yearSum),talent=sumDigits(year);
  const highest=Math.max(day,month,year),node=highest-month;
  const balance=reduceKeepZero(Math.abs(node-day));
  const age=d.r-b.r-((d.m<b.m || (d.m===b.m&&d.d<b.d))?1:0);
  const utc=x=>{const t=new Date(0);t.setUTCFullYear(x.r,x.m-1,x.d);t.setUTCHours(0,0,0,0);return t;};
  const daysAlive=Math.round((utc(d)-utc(b))/86400000);
  const group=age<=6?'0-6':age<=15?'7-15':age<=21?'16-21':age<=39?'22-39':age<=59?'40-59':age<=79?'60-79':'80+';
  return {day,month,yearSum,year,talent,highest,node,balance,age,daysAlive,group,sameDay:birth===death};
}
export function validatePeople(people,kind) {
  if(!Array.isArray(people)||people.length<(kind==='rodzenstwo'?1:2)||people.length>15)throw new Error('Dodaj od 1 do 15 osób do rodzeństwa; pozostałe relacje wymagają co najmniej dwóch osób.');
  if(['partnerski','rodzic-dziecko'].includes(kind)&&people.length!==2)throw new Error('Ten raport wymaga dwóch osób.');
  const ids=new Set(people.map(p=>p.id));
  if(ids.size!==people.length)throw new Error('Oznaczenia osób muszą być unikalne.');
  for(const p of people){
    if(!p.name?.trim())throw new Error('Wpisz imię każdej osoby.');
    if(!['living','deceased'].includes(p.status))throw new Error(`Wybierz status osoby ${p.name}.`);
    parseDate(p.birth);
    if(p.status==='deceased'){if(!p.death)throw new Error(`Podaj datę odejścia osoby ${p.name}.`);inheritance(p.birth,p.death);}
    for(const parent of [p.motherId,p.fatherId].filter(Boolean)){if(parent===p.id||!ids.has(parent))throw new Error('Sprawdź przypisania rodziców w drzewie.');}
    if(p.motherId&&p.motherId===p.fatherId)throw new Error('Matka i ojciec muszą być różnymi osobami.');
  }
  const visit=(id,path)=>{if(path.has(id))throw new Error('W drzewie występuje cykl: osoba nie może być swoim przodkiem.');const p=people.find(p=>p.id===id);const next=new Set(path);next.add(id);for(const parent of [p.motherId,p.fatherId].filter(Boolean))visit(parent,next);};
  people.forEach(p=>visit(p.id,new Set()));
  return people;
}
export function makeRelationReport(product,people,data) {
  if(product.id==='alchemia')throw new Error('Alchemia Naczynia jest w przygotowaniu.');
  validatePeople(people,product.id);
  const analyses=people.map(person=>({...person,name:person.name.trim().slice(0,80),profile:calculate(person.birth),inheritance:person.status==='deceased'?inheritance(person.birth,person.death):null,posag:person.status==='deceased'?posagMethods(person.birth,person.death):null}));
  const primary=analyses[0],chapters=[];
  const nameById=id=>analyses.find(p=>p.id===id)?.name||'Nie wskazano';
  const compare=(a,b,label)=>{
    const paragraphs=[`Relacja: ${a.name} — ${b.name}. ${label}`];
    for(const [key,title] of FIELDS){const av=a.profile[key],bv=b.profile[key];paragraphs.push(av===bv?`${title}: obie osoby mają wartość ${av}. To podobny temat w tej pozycji kodu; nie oznacza dziedziczenia osobistej lekcji ani automatycznego dopełnienia cyklu.`:`${title}: ${a.name} — ${av}; ${b.name} — ${bv}. Te wartości są odmiennymi punktami odniesienia dla refleksji nad relacją.`);}
    for(const p of [a,b].filter(p=>p.inheritance)){const q=p===a?b:a;const value=p.posag.method1;paragraphs.push(`Posag osoby ${p.name}: metoda 1 — ${value}; metoda 2 — ${p.posag.method2===0?'0, warunek 9–9 spełniony':'warunek 9–9 niespełniony'}. W tej relacji analizujemy go osobno od parametrów urodzenia osoby ${q.name}, z uwzględnieniem pamięci i więzi.`);if(value===q.profile.Prawa)paragraphs.push(`Wartość posagu ${value} odpowiada liczbowo Darowi osoby ${q.name}. Ta zbieżność może stać się tematem refleksji; nie dowodzi automatycznego przekazania cech.`);}
    chapters.push({title:`${a.name} i ${b.name}`,paragraphs});
  };
  chapters.push({title:'Mapa tej analizy',paragraphs:[product.description,'Interpretacje są symboliczne i służą osobistej refleksji. Podobieństwa liczb nie są dowodem dziedziczenia cech, osobistych lekcji ani wpływu zmarłych na los bliskich.',...analyses.map(p=>`${p.name} • ${p.relation||'Osoba w analizie'} • ${p.status==='living'?'Osoba żyjąca':'Osoba nieżyjąca'} • ${formatDate(p.birth)}${p.status==='deceased'?` — ${formatDate(p.death)}`:''}`)]});
  if(product.id==='kronika'){
    chapters.push({title:'Drzewo rodzicielstwa',paragraphs:analyses.map(p=>`${p.name}: matka — ${nameById(p.motherId)}; ojciec — ${nameById(p.fatherId)}.`)});
    const branch=(id,title)=>{if(!id)return;const seen=new Set();const queue=[id];while(queue.length){const next=queue.shift();if(seen.has(next))continue;seen.add(next);const p=analyses.find(p=>p.id===next);if(p)queue.push(...[p.motherId,p.fatherId].filter(Boolean));}const members=analyses.filter(p=>seen.has(p.id));chapters.push({title,paragraphs:members.map(p=>`${p.name} • ${p.status==='living'?'Profil urodzenia':`Posag, metoda 1: ${p.posag.method1} • metoda 2: ${p.posag.method2===0?'0':'warunek niespełniony'} • ${p.inheritance.group} lat`}.`)});};
    branch(primary.motherId,'Linia matki');branch(primary.fatherId,'Linia ojca');
  }
  for(const p of analyses){
    chapters.push({title:`Kod urodzenia • ${p.name}`,paragraphs:[`Data urodzenia: ${formatDate(p.birth)}. ${FIELDS.map(([key,label])=>`${label}: ${p.profile[key]}`).join(' • ')}.`]});
    if(p.status==='living'){
      for(const [key,title] of FIELDS){const section=data.report.sections[key],n=p.profile[key];chapters.push({title:`${p.name} • ${title} ${n}`,paragraphs:[...section.introduction,...section.extended[n]]});}
    }else{
      const l=p.inheritance,ageData=data.inheritance.ageGroups[l.group];
      const legacyTitle=product.id==='partnerski'?'Posag w pamięci ukochanej osoby':'Posag energetyczny';
      const paragraphs=[`Data odejścia: ${formatDate(p.death)}. Wiek: ${l.age} ukończonych lat; ${l.daysAlive} dni między datami. Klucz języka opisu: ${ageData.label}.`];
      if(l.sameDay)paragraphs.push(...data.inheritance.sameDayIntroduction);
      paragraphs.push(`Parametry daty odejścia w kodzie 22 wartości: dzień ${l.day}; miesiąc ${l.month}; suma cyfr roku ${l.yearSum}${l.yearSum>22?` → ${l.year}`:''}; talent ${l.talent}.`,`Węzeł odejścia: max(${l.day}, ${l.month}, ${l.year}) − ${l.month} = ${l.node}. Parametr końcowy kodu odejścia: |${l.node} − ${l.day}| = ${l.balance}. Ten zapis kodu jest osobną informacją od dwóch metod posagu.`);
      chapters.push({title:`${legacyTitle} • ${p.name}`,paragraphs});
      const t=p.posag;
      chapters.push({title:`Metoda 1: Dopełnienie Cyklu • ${p.name}`,paragraphs:[data.inheritance.method1Introduction,`Wibracja narodzin: ${t.born}. Wibracja odejścia: ${t.died}. Różnica: |${t.born} − ${t.died}| = ${t.method1}.`,...ageData.descriptions[t.method1].paragraphs]});
      chapters.push({title:`Metoda 2: Portal Przejścia • ${p.name}`,paragraphs:[data.inheritance.method2Introduction,`Rok osobisty w chwili odejścia: ${t.personalYear}. Wibracja dnia i miesiąca odejścia: ${t.deathDayMonth}.`,...(t.method2===0?[`Warunek 9–9 spełniony: 9 − 9 = 0.`,...ageData.descriptions[0].paragraphs]:['Warunek 9–9 nie został spełniony. Ta metoda nie nadaje wyniku zero ani innej domyślnej liczby. Nie jest to ocena życia zmarłej osoby.'])]});
    }
  }
  if(product.id==='kronika'){
    const seenPairs=new Set();for(const p of analyses){for(const id of [p.motherId,p.fatherId].filter(Boolean)){const parent=analyses.find(x=>x.id===id);compare(p,parent,'Relacja rodzic–dziecko w drzewie.');}if(p.motherId&&p.fatherId){const key=[p.motherId,p.fatherId].sort().join(':');if(!seenPairs.has(key)){seenPairs.add(key);compare(analyses.find(x=>x.id===p.motherId),analyses.find(x=>x.id===p.fatherId),'Para rodziców w rodowodzie.');}}}
    for(let i=0;i<analyses.length;i++)for(let j=i+1;j<analyses.length;j++){const a=analyses[i],b=analyses[j];if((a.motherId&&a.motherId===b.motherId)||(a.fatherId&&a.fatherId===b.fatherId))compare(a,b,'Rodzeństwo wskazane przez wspólnego rodzica.');}
  }else for(let i=0;i<analyses.length;i++)for(let j=i+1;j<analyses.length;j++)compare(analyses[i],analyses[j],product.id==='partnerski'?'Relacja partner–partnerka obejmuje także pamięć osoby, która odeszła.':'Analiza wskazanej relacji.');
  chapters.push({title:'Synteza tej relacji',paragraphs:['Każda osoba zachowuje własny kod i własną historię. Wspólna liczba może wskazywać podobny temat do refleksji, a różnica — odmienną perspektywę. Samo powtórzenie wartości nie dowodzi ani długu, ani jego spłaty.','Posag osoby zmarłej jest opisany z daty odejścia i z uwzględnieniem wieku. W liniach matki i ojca pokazujemy go przy konkretnej osobie; w partnerstwie rozpatrujemy go w kontekście więzi i pamięci ukochanej osoby.']});
  const sections=FIELDS.map(([key,title])=>({key,title,value:primary.profile[key],letter:METHOD_CONFIG.letters[key][primary.profile[key]].symbol||LETTERS[primary.profile[key]]}));
  return {kind:'relation',title:product.title,name:analyses.length===2?`${analyses[0].name} i ${analyses[1].name}`:primary.name,date:primary.birth,profile:primary.profile,sections,chapters,people:analyses,quote:data.report.quote,generated:new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw'}).format(new Date())};
}

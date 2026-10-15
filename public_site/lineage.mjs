import {calculate,profile,parseDate,sumDigits,reduce22,FIELDS,formulae} from './calculator.mjs';
import {formatDate,LETTERS} from './report.mjs';
import {METHOD_CONFIG,letterSummary} from './method-config.mjs';
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
  const day=reduce22(d.d),month=d.m,yearSum=sumDigits(d.r),year=reduce22(yearSum),talent=year;
  const [highest,middle,lowest]=[day,month,year].sort((a,b)=>b-a),node=highest-middle;
  const balance=reduceKeepZero(Math.abs(node-lowest));
  const age=d.r-b.r-((d.m<b.m || (d.m===b.m&&d.d<b.d))?1:0);
  const utc=x=>{const t=new Date(0);t.setUTCFullYear(x.r,x.m-1,x.d);t.setUTCHours(0,0,0,0);return t;};
  const daysAlive=Math.round((utc(d)-utc(b))/86400000);
  const group=age<=6?'0-6':age<=15?'7-15':age<=21?'16-21':age<=39?'22-39':age<=59?'40-59':age<=79?'60-79':'80+';
  return {day,month,yearSum,year,talent,highest,middle,lowest,node,balance,age,daysAlive,group,sameDay:birth===death};
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
export function makeRelationReport(product,people,data){
 if(product.id==='alchemia')throw Error('Alchemia Naczynia jest w przygotowaniu.');
 validatePeople(people,product.id);
 const analyses=people.map(p=>({...p,name:p.name.trim().slice(0,80),profile:calculate(p.birth),inheritance:p.status==='deceased'?inheritance(p.birth,p.death):null,posag:p.status==='deceased'?posagMethods(p.birth,p.death):null}));
 const primary=analyses[0],chapters=[];
 for(const p of analyses){
 const f=formulae(p.birth,p.profile);
 chapters.push({title:`Profil • ${p.name}`,paragraphs:[`Data urodzenia: ${formatDate(p.birth)}.`,...FIELDS.map(([key,title])=>`${title}: ${letterSummary(p.profile[key])} Obliczenie: ${f[key]}.`)]});
 if(product.id==='kronika'){const name=id=>analyses.find(p=>p.id===id)?.name||'Nie wskazano';chapters.push({title:`Rodzice • ${p.name}`,paragraphs:[`Matka: ${name(p.motherId)}. Ojciec: ${name(p.fatherId)}.`]});}
 if(p.posag){const l=p.inheritance,t=p.posag;
 chapters.push({title:`Posag • ${p.name}`,paragraphs:[`Data odejścia: ${formatDate(p.death)}. Wiek: ${l.age} lat; ${l.daysAlive} dni między datami.`,`Kod daty odejścia: ${l.day}, ${l.month}, ${l.year}. Różnica: ${l.highest} − ${l.middle} − ${l.lowest}; wartość bezwzględna: ${l.balance}. ${letterSummary(l.balance)}`,`Metoda 1: |${t.born} − ${t.died}| = ${t.method1}. ${letterSummary(t.method1)}`,`Metoda 2: rok osobisty ${t.personalYear}; dzień i miesiąc ${t.deathDayMonth}. ${t.method2===0?'Warunek 9–9 spełniony; wynik 0, bez litery.':'Warunek 9–9 niespełniony; brak wyniku.'}`]});}
 }
 for(let i=0;i<analyses.length;i++)for(let j=i+1;j<analyses.length;j++){const a=analyses[i],b=analyses[j];chapters.push({title:`Porównanie • ${a.name} i ${b.name}`,paragraphs:FIELDS.map(([key,title])=>`${title}: ${a.name} — ${letterSummary(a.profile[key])} ${b.name} — ${letterSummary(b.profile[key])} ${a.profile[key]===b.profile[key]?'Wartości równe.':'Wartości różne.'}`)});}
 const sections=FIELDS.map(([key,title])=>({key,title,value:primary.profile[key],letter:LETTERS[primary.profile[key]]}));
 return {numericOnly:true,kind:'relation',title:product.title,name:analyses.map(p=>p.name).join(' i '),date:primary.birth,profile:primary.profile,sections,chapters,people:analyses,quote:'',generated:new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw'}).format(new Date())};
}

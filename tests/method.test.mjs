import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculate,profile,runControls,parseDate,reduce22,FIELDS} from '../dist/calculator.mjs';
import {makeReport} from '../dist/report.mjs';
import {inheritance,makeRelationReport,validatePeople,posagMethods,runPosagControls} from '../dist/lineage.mjs';
import {validateContent} from '../dist/app.mjs';
import {buildPDF} from '../dist/pdf.mjs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('dist/assets/report-content.json',root)));
const metrics=JSON.parse(fs.readFileSync(new URL('dist/assets/font-metrics.json',root)));
const font=fs.readFileSync(new URL('dist/assets/report-font.ttf',root));
test('dziesięć ręcznie zapisanych przypadków chroni pierwotną metodykę',()=>{assert.equal(runControls().length,10);for(const c of runControls())assert.ok(c.ok,c.date+': '+c.actual);});
test('rok zachowuje sumy 19, 21 i 22; redukuje 23; talent sumowany raz',()=>{assert.equal(calculate('1974-11-06').Gleboka,21);assert.equal(calculate('1975-11-06').Gleboka,22);assert.equal(calculate('1976-11-06').Gleboka,5);assert.equal(calculate('1981-11-06').Talent,10);assert.equal(reduce22(0),22);});
test('walidacja dat: rok przestępny, nieistniejące i przyszłe daty',()=>{assert.equal(parseDate('2000-02-29').d,29);for(const date of ['1900-02-29','2001-02-29','2026-04-31','0000-01-01','abc','2026-13-01','9999-01-01'])assert.throws(()=>parseDate(date));assert.equal(parseDate('0001-01-01').r,1);});
test('132 odrębne opisy oraz 161 opisów posagu są kompletne',()=>{validateContent(data);for(const[key]of FIELDS){assert.equal(Object.keys(data.report.sections[key].extended).length,22);for(let n=1;n<=22;n++)assert.ok(data.report.sections[key].extended[n].join('').length>50);}assert.equal(Object.keys(data.inheritance.ageGroups).length,7);assert.notDeepEqual(data.report.sections.Prawa.extended[6],data.report.sections.Lewa.extended[6]);assert.notDeepEqual(data.report.sections.Gleboka.extended[6],data.report.sections.Talent.extended[6]);});
test('raport zmienia wartości i opis zgodnie z parametrem, nie z szablonem Emilii',()=>{const a=makeReport('Emilia','1974-11-06',calculate('1974-11-06'),data,data.report),b=makeReport('Anna','1985-04-07',calculate('1985-04-07'),data,data.report);assert.equal(a.sections[2].value,21);assert.equal(b.sections[2].value,5);assert.deepEqual(a.sections[3].interpretation,data.report.sections.Talent.extended[3]);assert.deepEqual(b.sections[3].interpretation,data.report.sections.Talent.extended[5]);assert.notDeepEqual(a.sections[3].interpretation,b.sections[3].interpretation);assert.equal(a.quote, data.report.quote);});
test('redakcja opisu nie zmienia matematyki; eksportowane dane są walidowane',()=>{const edited=structuredClone(data);edited.report.sections.Prawa.extended[6]=['Autorska redakcja daru.'];validateContent(edited);const p=calculate('1974-11-06');assert.equal(makeReport('Emilia','1974-11-06',p,edited,edited.report).sections[0].interpretation[0],'Autorska redakcja daru.');assert.equal(p.Gleboka,21);delete edited.report.sections.Talent.extended[3];assert.throws(()=>validateContent(edited));});
test('posag zero jest możliwy u osoby starszej i nie jest zamieniany na 22',()=>{const p=inheritance('1930-02-01','2016-03-06');assert.equal(p.age,86);assert.equal(p.group,'80+');assert.equal(posagMethods('1930-03-02','2016-03-06').method1,0);});
test('dziecko zmarłe w dniu narodzin nie otrzymuje automatycznie zerowego posagu',()=>{const p=inheritance('2000-02-01','2000-02-01');assert.equal(p.sameDay,true);assert.equal(p.daysAlive,0);assert.equal(p.age,0);assert.equal(p.group,'0-6');assert.equal(p.balance,1);assert.throws(()=>inheritance('2000-02-01','2000-01-31'));});
test('ukończony wiek wybiera odpowiednią grupę na granicy urodzin',()=>{assert.equal(inheritance('2000-10-14','2007-10-13').group,'0-6');assert.equal(inheritance('2000-10-14','2007-10-14').group,'7-15');assert.equal(inheritance('2000-10-14','2016-10-14').group,'16-21');assert.equal(inheritance('2000-10-14','2022-10-14').group,'22-39');});
test('drzewo uwzględnia rodziców i odrzuca cykle',()=>{const people=[{id:'a',name:'Anna',birth:'1974-11-06',status:'living',motherId:'b'},{id:'b',name:'Maria',birth:'1930-02-01',status:'deceased',death:'2016-03-06'}];validatePeople(people,'kronika');const report=makeRelationReport(data.products[4],people,data);assert.ok(report.chapters.some(c=>c.title==='Linia matki'));assert.ok(report.chapters.some(c=>c.title.includes('Posag energetyczny')));const cycle=structuredClone(people);cycle[1].motherId='a';assert.throws(()=>validatePeople(cycle,'kronika'));});
test('partnerstwo obejmuje posag zmarłej osoby i obie odrębne metody posagu',()=>{const people=[{id:'a',name:'Anna',birth:'1974-11-06',status:'living'},{id:'b',name:'Jan',birth:'1930-02-01',status:'deceased',death:'2016-03-06'}];const report=makeRelationReport(data.products[1],people,data);assert.ok(report.chapters.some(c=>c.title.includes('Posag w pamięci ukochanej osoby')));assert.ok(report.chapters.some(c=>c.title.includes('Metoda 2: Portal Przejścia')));});
test('PDF jest samodzielnym plikiem Unicode z aktualnymi danymi',()=>{const report=makeReport('Emilia','1974-11-06',calculate('1974-11-06'),data,data.report),pdf=buildPDF(report,font,metrics);assert.ok(pdf.pageCount>=9);assert.ok(Buffer.from(pdf.bytes).subarray(0,8).toString().startsWith('%PDF-1.7'));assert.ok(Buffer.from(pdf.bytes).includes(Buffer.from('/FontFile2')));});
test('w kodzie i aktywnej bazie nie ma starych funkcji ani symboli',()=>{for(const filename of ['dist/lineage.mjs','app.py','dane.py','dist/assets/report-content.json']){let text=fs.readFileSync(new URL(filename,root),'utf8');if(filename.endsWith('.json')){const active=JSON.parse(text);for(const section of Object.values(active.report.sections))delete section.variants;text=JSON.stringify(active);}assert.doesNotMatch(text,/Głupiec|Wisielec|Cesarzowa|Papież|Kapłanka|Koło Fortuny|Rydwan/);}});

test("obie metody posagu są sprawdzane oddzielnie",()=>{for(const c of runPosagControls())assert.ok(c.ok,c.label+":"+c.actual);const p=posagMethods("1990-09-27","2016-09-27");assert.equal(p.method1,8);assert.equal(p.method2,0);const p2=posagMethods("1970-05-12","2016-08-24");assert.equal(p2.died,5);assert.equal(p2.personalYear,8);assert.equal(p2.method2,null);});

test("edycja danych opisowych nie zmienia przypisania liter",()=>{const d=structuredClone(data);d.report.sections.Prawa.letters={6:{name:"Inna nazwa",symbol:"X"}};const report=makeReport("Emilia","1974-11-06",calculate("1974-11-06"),d,d.report);assert.equal(report.sections[0].letter,"ו");});


test('rodzeństwo obejmuje 1–15 osób i porównuje wszystkie pary',()=>{
 const people=Array.from({length:15},(_,i)=>({id:'s'+i,name:'Osoba '+i,birth:'1974-11-06',status:'living'}));
 validatePeople(people,'rodzenstwo');validatePeople(people.slice(0,1),'rodzenstwo');
 assert.throws(()=>validatePeople([...people,{...people[0],id:'extra'}],'rodzenstwo'));
 const report=makeRelationReport(data.products[3],people,data);
 assert.equal(report.chapters.filter(c=>c.title.includes(' i ')).length,105);
 assert.throws(()=>makeRelationReport(data.products[5],people.slice(0,2),data),/przygotowaniu/);
});

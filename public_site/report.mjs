import {FIELDS,METHOD_VERSION,formulae,parseDate} from './calculator.mjs';
import {HEBREW_LETTERS,letterSummary} from './method-config.mjs';
export const LETTERS=Object.fromEntries(Object.entries(HEBREW_LETTERS).map(([n,l])=>[n,l.symbol]));
export const formatDate=date=>date.split('-').reverse().join('.');
export function makeReport(name,date,p,content,template){
 parseDate(date);const formula=formulae(date,p);
 return {numericOnly:true,name:name.trim().slice(0,80)||'Twój profil',date,profile:{...p},formula,method:METHOD_VERSION,
 sections:FIELDS.map(([key,title])=>({key,title,value:p[key],letter:HEBREW_LETTERS[p[key]].symbol,letterName:HEBREW_LETTERS[p[key]].name,formula:formula[key],introduction:[],interpretation:[letterSummary(p[key])],extended:false})),
 footer:template.footer,introduction:['Wynik 1–22 wskazuje pozycję litery w alfabecie hebrajskim. Gematria standardowa jest osobną wartością. Powiązania liter podajemy według redakcji Gra Sefer Jecira. Obliczenia z dat są zasadą tego projektu, a nie metodą opisaną w Sefer Jecira.'],synthesis:[],quote:'',generated:new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw'}).format(new Date())};
}

import {FIELDS, METHOD_VERSION, formulae, parseDate} from './calculator.mjs';
import {METHOD_CONFIG} from './method-config.mjs';
export const LETTERS={1:'א',2:'ב',3:'ג',4:'ד',5:'ה',6:'ו',7:'ז',8:'ח',9:'ט',10:'י',11:'כ',12:'ל',13:'מ',14:'נ',15:'ס',16:'ע',17:'צ',18:'ק',19:'ר',20:'ש',21:'ת',22:'∞'};
export const formatDate=date=>date.split('-').reverse().join('.');
export function makeReport(name,date,p,content,template) {
  parseDate(date);
  const safeName=name.trim().slice(0,80)||'Twój profil';
  const formula=formulae(date,p), sections=FIELDS.map(([key,title])=>{
    const value=p[key], info=content.base[value], extended=template.sections[key].extended[value];
    const letter=METHOD_CONFIG.letters[key][value];
    return {key,title,value,letter:letter?.symbol||LETTERS[value],letterName:letter?.name||(value===6?'Waw':info.litera),
      formula:formula[key], introduction:template.sections[key].introduction,
      interpretation:extended||[content.interpretations[value]?.[key]||info.znaczenie],extended:!!extended};
  });
  return {name:safeName,date,profile:{...p},formula,sections,method:METHOD_VERSION,
    footer:template.footer,introduction:template.introduction,synthesis:template.synthesis,quote:typeof template.quote==='string'?template.quote:template.quote[0],
    generated:new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw'}).format(new Date())};
}

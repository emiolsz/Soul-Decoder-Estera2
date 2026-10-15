export const METHOD_VERSION = 'profil-urodzenia-2.0-transkrypcja';
export const FIELDS = [
  ['Prawa', 'Dar'], ['Lewa', 'Karma'], ['Gleboka', 'Głęboka osobowość'],
  ['Talent', 'Składowa roku'], ['Wezel', 'Różnica pośrednia'], ['Tikkun', 'Węzeł oporu / Tikkun']
];
export const sumDigits = n => [...String(n)].reduce((s,c)=>s+Number(c),0);
export function reduce22(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Nieprawidłowa wartość.');
  if (n === 0) return 22;
  while (n > 22) n = sumDigits(n);
  return n;
}
export function todayWarsaw() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Warsaw', year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function parseDate(value, maxDate=todayWarsaw()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Wpisz pełną datę urodzenia.');
  const [r,m,d]=value.split('-').map(Number);
  const leap=r%4===0 && (r%100!==0 || r%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(r<1 || m<1 || m>12 || d<1 || d>days[m-1]) throw new Error('Ta data nie istnieje w kalendarzu.');
  if(value>maxDate) throw new Error('Data urodzenia nie może przypadać w przyszłości.');
  return {d,m,r};
}
export function profile(d,m,r) {
  const Prawa=reduce22(d), Lewa=reduce22(m), yearSum=sumDigits(r);
  const yearComponent=reduce22(yearSum), Talent=yearComponent;
  const personalitySum=Prawa+Lewa+yearComponent, Gleboka=reduce22(personalitySum);
  const ordered=[Prawa,Lewa,yearComponent].sort((a,b)=>b-a);
  const [highest,middle,lowest]=ordered, rawNode=highest-middle;
  // Zero pośrednie zostaje zerem do końca odejmowania.
  const Wezel=rawNode, rawTikkun=rawNode-lowest, Tikkun=reduce22(Math.abs(rawTikkun));
  return {Prawa,Lewa,Gleboka,Talent,Tikkun,Wezel,yearSum,yearComponent,personalitySum,highest,middle,lowest,rawNode,rawTikkun};
}
export function calculate(value,maxDate) {const {d,m,r}=parseDate(value,maxDate);return profile(d,m,r);}
export function formulae(date,p) {
  const {d,m,r}=parseDate(date);
  const digits=n=>[...String(n)].join(' + ');
  return {
    Prawa:d>22?`${d} → ${digits(d)} = ${p.Prawa}`:`Dzień urodzenia: ${d}`,
    Lewa:`Miesiąc urodzenia: ${m}`,
    Gleboka:`${p.Prawa} + ${p.Lewa} + ${p.yearComponent} = ${p.personalitySum}${p.personalitySum>22?` → ${p.Gleboka}`:''}`,
    Talent:`${digits(r)} = ${p.yearSum}${p.yearSum>22?` → ${p.yearComponent}`:' (zachowane: suma ≤ 22)'}`,
    Wezel:`max / środkowa / min: ${p.highest}, ${p.middle}, ${p.lowest}; ${p.highest} − ${p.middle} = ${p.rawNode}`,
    Tikkun:`${p.rawNode} − ${p.lowest} = ${p.rawTikkun}${p.rawTikkun<0?` → |${p.rawTikkun}| = ${Math.abs(p.rawTikkun)}`:''}${p.rawTikkun===0?' → 22':''}`
  };
}
// Oczekiwane wyniki są zapisane ręcznie; nie są wyliczane silnikiem.
export const CONTROL_CASES = [
 {date:'1990-10-23',label:'Przykład z transkrypcji',why:'5 + 10 + 19 → 7; 19 − 10 − 5 = 4.',expected:[5,10,7,19,9,4]},
 {date:'1990-03-14',label:'Miesiąc najmniejszy',why:'14 + 3 + 19 → 9; 19 − 14 − 3 = 2.',expected:[14,3,9,19,5,2]},
 {date:'2000-12-31',label:'Miesiąc największy',why:'4 + 12 + 2 = 18; 12 − 4 − 2 = 6.',expected:[4,12,18,2,8,6]},
 {date:'2000-05-05',label:'Zero pośrednie',why:'5 − 5 = 0; 0 − 2 = −2 → 2. Nie zamieniamy zera pośredniego na 22.',expected:[5,5,12,2,0,2]},
 {date:'1971-12-06',label:'Zero końcowe',why:'18 − 12 − 6 = 0 → 22.',expected:[6,12,9,18,6,22]}
];
export const profileValues=p=>FIELDS.map(([key])=>p[key]);
export function runControls() {return CONTROL_CASES.map(c=>{const actual=profileValues(calculate(c.date));return {...c,actual,ok:actual.every((n,i)=>n===c.expected[i])};});}

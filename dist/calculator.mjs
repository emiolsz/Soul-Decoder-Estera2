export const METHOD_VERSION = 'profil-urodzenia-1.0';
export const FIELDS = [
  ['Prawa', 'Dar'], ['Lewa', 'Karma'], ['Gleboka', 'Głęboka osobowość'],
  ['Talent', 'Talent / Kreacja'], ['Wezel', 'Węzeł oporu'], ['Tikkun', 'Tikkun']
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
  const Gleboka=reduce22(yearSum);
  // Sumowanie cyfr dokładnie jeden raz, zgodnie z oryginalnym app.py.
  const Talent=sumDigits(Gleboka);
  const highest=Math.max(Prawa,Lewa,Gleboka), rawNode=highest-Lewa;
  const Wezel=reduce22(rawNode), rawTikkun=Math.abs(Wezel-Prawa);
  const Tikkun=reduce22(rawTikkun);
  return {Prawa,Lewa,Gleboka,Talent,Wezel,Tikkun,yearSum,highest,rawNode,rawTikkun};
}
export function calculate(value,maxDate) {const {d,m,r}=parseDate(value,maxDate);return profile(d,m,r);}
export function formulae(date,p) {
  const {d,m,r}=parseDate(date);
  const digits=n=>[...String(n)].join(' + ');
  return {
    Prawa:d>22?`${d} → ${digits(d)} = ${p.Prawa}`:`Dzień urodzenia: ${d}`,
    Lewa:`Miesiąc urodzenia: ${m}`,
    Gleboka:`${digits(r)} = ${p.yearSum}${p.yearSum>22?` → ${digits(p.yearSum)} = ${p.Gleboka}`:' (zachowane: suma ≤ 22)'}`,
    Talent:`${digits(p.Gleboka)} = ${p.Talent}`,
    Wezel:`max(${p.Prawa}, ${p.Lewa}, ${p.Gleboka}) = ${p.highest}; ${p.highest} − ${p.Lewa} = ${p.rawNode}${p.rawNode===0?' → 22':''}`,
    Tikkun:`|${p.Wezel} − ${p.Prawa}| = ${p.rawTikkun}${p.rawTikkun===0?' → 22':''}`
  };
}
// Oczekiwane wyniki są zapisane ręcznie; nie są wyliczane silnikiem.
export const CONTROL_CASES = [
  {date:'1974-11-06',label:'Przykład Emilii',why:'Rok 21 pozostaje 21; talent to 3.',expected:[6,11,21,3,10,4]},
  {date:'1975-11-06',label:'Granica 22',why:'Suma roku równa 22 nie jest redukowana.',expected:[6,11,22,4,11,5]},
  {date:'1976-11-06',label:'Suma roku 23',why:'Dopiero 23 redukuje się do 5; węzeł 0 → 22.',expected:[6,11,5,5,22,16]},
  {date:'1981-11-06',label:'Talent 10',why:'19 → 1 + 9 = 10, bez kolejnej redukcji do 1.',expected:[6,11,19,10,8,2]},
  {date:'1985-04-07',label:'Najwyższy jest dzień',why:'Do węzła wybieramy max(7, 4, 5), a nie zawsze rok.',expected:[7,4,5,5,3,4]},
  {date:'2000-01-22',label:'Dzień 22',why:'Dzień równy 22 pozostaje bez zmian.',expected:[22,1,2,2,21,1]},
  {date:'2000-01-23',label:'Dzień 23',why:'Dzień większy niż 22 redukuje się do 5.',expected:[5,1,2,2,4,1]},
  {date:'2000-12-31',label:'Najwyższy jest miesiąc',why:'31 → 4; max to 12; surowy węzeł 0 → 22.',expected:[4,12,2,2,22,18]},
  {date:'2000-05-10',label:'Wartość bezwzględna',why:'Tikkun: |5 − 10| = 5.',expected:[10,5,2,2,5,5]},
  {date:'1971-12-06',label:'Tikkun z różnicy 0',why:'|6 − 6| = 0 → 22 w profilu osoby żyjącej.',expected:[6,12,18,9,6,22]}
];
export const profileValues=p=>FIELDS.map(([key])=>p[key]);
export function runControls() {return CONTROL_CASES.map(c=>{const actual=profileValues(calculate(c.date));return {...c,actual,ok:actual.every((n,i)=>n===c.expected[i])};});}

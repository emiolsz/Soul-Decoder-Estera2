// Redakcja pojedynczego raportu. Nie zapisuje zmian w słowniku opisów.
export function attachReview(container, report, onApply) {
  container.replaceChildren();
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent='Sprawdź i edytuj ten raport przed przekazaniem';details.append(summary);
  const note=document.createElement('p');note.textContent='Poprawki dotyczą tylko tego raportu. Po zastosowaniu pobierz nowy PDF. Ponowne wygenerowanie analizy tworzy raport od początku. Pracownia nie wysyła raportów automatycznie.';details.append(note);
  const draft=structuredClone(report),fields=[];
  function field(label,object,key,array=false){
    if(object[key]===undefined)return;
    const wrap=document.createElement('label');wrap.textContent=label;
    const input=document.createElement('textarea');input.rows=array?8:2;input.style.cssText='display:block;width:100%;box-sizing:border-box;margin:8px 0 20px';input.value=array?object[key].join('\n\n'):object[key];
    wrap.append(input);details.append(wrap);fields.push({input,object,key,array});
  }
  field('Tytuł raportu',draft,'title');field('Cytat',draft,'quote');field('Wprowadzenie',draft,'introduction',true);
  if(draft.chapters)for(const c of draft.chapters){field('Tytuł rozdziału',c,'title');field(c.title,c,'paragraphs',true);}
  else {for(const s of draft.sections){field('Tytuł sekcji',s,'title');field(s.title+' — wprowadzenie',s,'introduction',true);field(s.title+' — interpretacja',s,'interpretation',true);}field('Synteza',draft,'synthesis',true);}
  field('Stopka tego raportu',draft,'footer');
  const apply=document.createElement('button');apply.type='button';apply.className='button primary';apply.textContent='Zastosuj poprawki i odśwież PDF';
  const status=document.createElement('p');status.setAttribute('role','status');
  apply.onclick=()=>{try{for(const f of fields){const value=f.input.value.trim();if(!value)throw Error('Uzupełnij puste pola przed zapisaniem.');f.object[f.key]=f.array?value.split(/\n\s*\n/).filter(Boolean):value;}onApply(structuredClone(draft));status.textContent='Poprawki zastosowane. Pobierz poprawiony PDF przyciskiem raportu.';}catch(e){status.textContent=e.message;}};
  details.append(apply,status);container.append(details);
}

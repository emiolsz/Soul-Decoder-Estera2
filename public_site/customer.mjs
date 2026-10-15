const request=async(path,method='GET',body)=>{const r=await fetch('/api/'+path,{method,cache:'no-store',headers:{'Content-Type':'application/json','X-SD-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'Operacja nie powiodła się.'),{status:r.status});return data;};
let user=null;
async function identity(){try{user=await request('customer/me');return user;}catch(e){if(e.status===401||e.status===403){user=null;return null;}throw e;}}
function loginForm(container,onLogin){
 const form=document.createElement('form');form.innerHTML='<label>Adres e-mail<input name="email" type="email" autocomplete="email" required></label><button class="button outline" type="button" data-send>Wyślij kod logowania</button><label>Kod z wiadomości e-mail<input name="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6,10}"></label><button class="button primary" type="submit">Zaloguj / utwórz konto</button><p role="status" data-status></p>';
 const status=form.querySelector('[data-status]');form.querySelector('[data-send]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{if(!form.elements.email.reportValidity())return;await request('customer/request-code','POST',{email:form.elements.email.value.trim()});status.textContent='Sprawdź skrzynkę i wpisz otrzymany kod.';}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{await request('customer/verify-code','POST',{email:form.elements.email.value.trim(),code:form.elements.code.value.trim()});await identity();form.remove();await onLogin(user);}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};container.append(form);
}
export async function registerOrder(report,people,product){
 const customer=await identity();
 return new Promise((resolve,reject)=>{
 const panel=document.createElement('section');panel.className='person-card';panel.id='order-registration';
 panel.innerHTML='<h2>Zapisz zamówienie</h2><p>Przed udostępnieniem raportu zaloguj się, podaj imię i potwierdź prośbę o wysłanie na swój adres. Test jest bezpłatny.</p><div data-login></div><form data-order hidden><label>Imię<input name="firstName" autocomplete="given-name" maxlength="80" required></label><p data-email></p><label><input type="checkbox" name="delivery" required> Proszę o przesłanie mojego raportu na potwierdzony adres e-mail.</label><p>W tej wersji zapisujemy prośbę. Automatyczna wysyłka PDF nie jest jeszcze uruchomiona.</p><button class="button primary" type="submit">Zapisz zamówienie i pokaż raport</button><p role="status" data-status></p></form><button type="button" class="button outline" data-cancel>Anuluj</button>';
 document.getElementById('relation-form').after(panel);panel.scrollIntoView({behavior:'smooth',block:'start'});
 const form=panel.querySelector('[data-order]'),status=panel.querySelector('[data-status]');const requestId=crypto.randomUUID();
 const authenticated=u=>{form.hidden=false;panel.querySelector('[data-email]').textContent='Potwierdzony adres: '+u.email;form.elements.firstName.value=u.name||'';};
 if(customer)authenticated(customer);else loginForm(panel.querySelector('[data-login]'),authenticated);
 panel.querySelector('[data-cancel]').onclick=()=>{panel.remove();reject(Error('Nie zapisano zamówienia.'));};
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{if(!form.elements.delivery.checked)throw Error('Zaznacz prośbę o wysłanie raportu.');const result=await request('orders','POST',{name:form.elements.firstName.value.trim(),product,people,report,delivery:true,request_id:requestId});panel.remove();resolve(result);}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
 });
}
export function installCustomerAccount(loadReport){
 const details=document.createElement('details');details.className='wrap';const summary=document.createElement('summary');summary.textContent='Moje konto i zamówienia';details.append(summary);const body=document.createElement('div');details.append(body);document.querySelector('footer').before(details);
 async function show(){body.replaceChildren();const u=await identity();if(!u){loginForm(body,show);return;}
 const who=document.createElement('p');who.textContent=u.email;body.append(who);const logout=document.createElement('button');logout.type='button';logout.className='button outline';logout.textContent='Wyloguj konto klienta';logout.onclick=async()=>{await request('customer/logout','POST',{});await show();};body.append(logout);
 const orders=await request('orders');if(!orders.length){const p=document.createElement('p');p.textContent='Nie masz jeszcze zamówień.';body.append(p);}
 for(const order of orders){const button=document.createElement('button');button.type='button';button.className='button outline';button.textContent=order.order_number+' • '+order.product_id;button.onclick=async()=>{try{const item=await request('orders/'+order.id);loadReport(item.report_body,item);}catch(e){const p=document.createElement('p');p.textContent=e.message;body.append(p);}};body.append(button);}
 }
 details.ontoggle=()=>{if(details.open)show().catch(e=>{body.textContent=e.message;});};
}

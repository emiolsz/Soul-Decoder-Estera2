"""Flask + Supabase. All staff files and mutations require verified membership."""
import os, json, mimetypes
from pathlib import Path
from urllib.parse import urlparse
import requests
from flask import Flask, request, jsonify, send_from_directory, redirect, g, abort

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

class RemoteError(Exception):
    def __init__(self, status): self.status = status

def supabase(path, method='GET', token=None, data=None, headers=None):
    base = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    if not base or not key: abort(503, description='Brak konfiguracji Supabase w Vercel.')
    hdr = {'apikey': key, 'Content-Type': 'application/json'}
    if token: hdr['Authorization'] = 'Bearer ' + token
    if headers: hdr.update(headers)
    try:
        r = requests.request(method, base + path, json=data, headers=hdr, timeout=15)
    except requests.RequestException: abort(503, description='Nie można połączyć się z bazą. Spróbuj ponownie.')
    if not r.ok: raise RemoteError(r.status_code)
    return r.json() if r.content else None

def membership(token):
    user = supabase('/auth/v1/user', token=token)
    rows = supabase('/rest/v1/pracownia_roles?select=role&user_id=eq.' + user['id'], token=token)
    if not rows or rows[0]['role'] not in ('admin', 'editor'): abort(403, description='Konto nie ma dostępu do pracowni.')
    return user, rows[0]['role']

def staff():
    if getattr(g, 'staff_checked', False): return
    token = request.cookies.get('sd_access')
    if not token: abort(401, description='Zaloguj się do pracowni.')
    try: user, role = membership(token)
    except RemoteError as e:
        if e.status not in (401, 403): abort(503, description='Nie można sprawdzić uprawnień.')
        refresh = request.cookies.get('sd_refresh')
        if not refresh: abort(401, description='Sesja wygasła. Zaloguj się ponownie.')
        try:
            session = supabase('/auth/v1/token?grant_type=refresh_token', 'POST', data={'refresh_token': refresh})
            token = session['access_token']; user, role = membership(token); g.new_session = session
        except RemoteError: abort(401, description='Sesja wygasła. Zaloguj się ponownie.')
    g.token, g.user, g.role, g.staff_checked = token, user, role, True

def admin():
    staff()
    if g.role != 'admin': abort(403, description='Ta czynność wymaga roli administratora.')

def set_session(response, session):
    secure = bool(os.getenv('VERCEL')) or request.is_secure
    # Access cookie lasts longer than JWT so the server can renew it with refresh.
    for name, value in [('sd_access', session['access_token']), ('sd_refresh', session['refresh_token'])]:
        response.set_cookie(name, value, max_age=7*86400, httponly=True, secure=secure, samesite='Strict', path='/')

@app.before_request
def guard_mutations():
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        origin = request.headers.get('Origin')
        if not origin or urlparse(origin).netloc != request.host or request.headers.get('X-SD-Request') != '1':
            abort(403, description='Nieprawidłowe źródło żądania.')
        if not request.is_json: abort(415)

@app.after_request
def secure_response(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'same-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    if request.path.startswith(('/api/', '/pracownia', '/konto')):
        response.headers['Cache-Control'] = 'private, no-store'
    if getattr(g, 'new_session', None): set_session(response, g.new_session)
    if getattr(g, 'new_customer_session', None): set_customer_session(response, g.new_customer_session)
    return response

@app.errorhandler(RemoteError)
def remote_error(error):
    return jsonify(error='Baza odrzuciła operację. Sprawdź konfigurację tabel i uprawnienia.'), 502

from werkzeug.exceptions import HTTPException
@app.errorhandler(HTTPException)
def http_error(error):
    if request.path.startswith('/api/'):
        return jsonify(error=error.description), error.code
    return '<p>' + str(error.code) + ' — Dostęp niedostępny. <a href="/pracownia">Przejdź do logowania</a></p>', error.code

@app.post('/api/login')
def login():
    payload = request.get_json()
    if not isinstance(payload, dict): abort(400)
    email, password = payload.get('email', ''), payload.get('password', '')
    if not isinstance(email, str) or not isinstance(password, str) or not email or not password or len(email)>254 or len(password)>1000: abort(400)
    try:
        session = supabase('/auth/v1/token?grant_type=password', 'POST', data={'email': email, 'password': password})
        user, role = membership(session['access_token'])
    except RemoteError: abort(401, description='Nie udało się zalogować. Sprawdź adres i hasło.')
    response = jsonify(role=role); set_session(response, session); return response

@app.post('/api/logout')
def logout():
    token=request.cookies.get('sd_access')
    if token:
        try:supabase('/auth/v1/logout','POST',token=token,data={})
        except (RemoteError,HTTPException):pass
    response = jsonify(ok=True)
    for name in ('sd_access', 'sd_refresh'): response.delete_cookie(name, path='/')
    return response

@app.get('/api/me')
def me():
    staff(); return jsonify(id=g.user['id'], email=g.user.get('email'), role=g.role)

@app.get('/pracownia')
def workshop(): return send_from_directory(ROOT, 'login.html')

@app.get('/pracownia/panel')
def panel():
    staff(); return send_from_directory(ROOT/'private_workshop', 'index.html')

@app.get('/pracownia/<path:name>')
def protected_file(name):
    staff()
    if name == 'assets/report-content.json':
        return jsonify(load_content('draft', g.token))
    return send_from_directory(ROOT/'private_workshop', name)

@app.get('/login.mjs')
def login_js(): return send_from_directory(ROOT, 'login.mjs')

def load_content(kind, token=None):
    rows = supabase('/rest/v1/pracownia_content?select=body,updated_at&id=eq.'+kind, token=token)
    if rows and rows[0]['body'].get('schemaVersion') == 1: return rows[0]['body']
    folder = 'private_workshop' if kind == 'draft' else 'public_site'
    return json.loads((ROOT/folder/'assets/report-content.json').read_text())

@app.get('/api/content')
def get_content():
    staff(); return jsonify(body=load_content('draft', g.token))

@app.put('/api/content')
def save_content():
    staff(); payload=request.get_json(); body=payload.get('body') if isinstance(payload,dict) else None
    if not isinstance(body,dict) or body.get('schemaVersion')!=1 or not isinstance(body.get('site'),dict) or len(body.get('products',[]))!=6 or not isinstance(body.get('report'),dict): abort(400,description='Nieprawidłowy plik opisów.')
    result=supabase('/rest/v1/pracownia_content?id=eq.draft','PATCH',token=g.token,data={'body':body,'updated_by':g.user['id']},headers={'Prefer':'return=representation'})
    if not result: abort(409,description='Brak wersji roboczej. Wykonaj skrypt SQL.')
    rows=supabase('/rest/v1/pracownia_content?select=body,updated_at&id=eq.draft',token=g.token)
    if not rows or rows[0].get('body') != body:
        abort(502,description='Nie udało się potwierdzić zapisu w bazie. Nie zamykaj edytora; spróbuj ponownie.')
    return jsonify(ok=True,verified=True,updated_at=rows[0].get('updated_at'))

@app.post('/api/publish')
def publish():
    admin(); supabase('/rest/v1/rpc/pracownia_publish','POST',token=g.token,data={});return jsonify(ok=True)

@app.get('/api/roles')
def list_roles():
    admin(); return jsonify(supabase('/rest/v1/rpc/pracownia_list_roles','POST',token=g.token,data={}))

@app.post('/api/roles')
def set_role():
    admin();payload=request.get_json();uid=payload.get('user_id');role=payload.get('role')
    if role not in ('admin','editor','none') or not isinstance(uid,str):abort(400)
    supabase('/rest/v1/rpc/pracownia_set_role','POST',token=g.token,data={'target_id':uid,'new_role':role});return jsonify(ok=True)

@app.get('/api/reports')
def list_reports():
    staff();return jsonify(supabase('/rest/v1/pracownia_reports?select=id,name,updated_at&order=updated_at.desc&limit=100',token=g.token))

@app.get('/api/reports/<uuid:report_id>')
def get_report(report_id):
    staff(); rows=supabase('/rest/v1/pracownia_reports?select=*&id=eq.'+str(report_id),token=g.token)
    if not rows:abort(404)
    return jsonify(rows[0])

@app.post('/api/reports')
def save_report():
    staff();payload=request.get_json();body=payload.get('body') if isinstance(payload,dict) else None
    if not isinstance(body,dict) or not isinstance(body.get('sections'),list) or not body.get('name') or not body.get('date'):abort(400,description='Nieprawidłowy raport.')
    row={'name':str(body['name'])[:100], 'body':body, 'updated_by':g.user['id']}
    rid=payload.get('id')
    if rid:
        import uuid
        try:rid=str(uuid.UUID(rid))
        except (ValueError,TypeError):abort(400)
        rows=supabase('/rest/v1/pracownia_reports?id=eq.'+rid,'PATCH',token=g.token,data=row,headers={'Prefer':'return=representation'})
        if not rows:abort(404)
    else:rows=supabase('/rest/v1/pracownia_reports','POST',token=g.token,data=row,headers={'Prefer':'return=representation'})
    return jsonify(id=rows[0]['id'])

@app.get('/api/materials')
def materials():
    staff();return jsonify([{'name':p.name,'url':'/api/materials/'+p.name} for p in (ROOT/'private_materials').iterdir() if p.is_file()])

@app.get('/api/materials/<path:name>')
def material(name):
    staff();return send_from_directory(ROOT/'private_materials',name,as_attachment=True)

@app.get('/assets/report-content.json')
def public_content():
    response=jsonify(load_content('published'))
    response.headers['Cache-Control']='no-store'
    return response

@app.get('/')
def home(): return send_from_directory(ROOT/'public_site','index.html')

@app.get('/<path:name>')
def public_file(name):
    # Never serve private folders, Python, SQL, or credentials through the public route.
    allowed={'index.html','app.mjs','calculator.mjs','lineage.mjs','method-config.mjs','pdf.mjs','report.mjs','style.css','customer.mjs'}
    if name not in allowed and not name.startswith('assets/'):abort(404)
    return send_from_directory(ROOT/'public_site',name)

# Customer sessions never grant staff membership.
def set_customer_session(response,session):
    secure=bool(os.getenv('VERCEL')) or request.is_secure
    for name,value in [('sd_customer_access',session['access_token']),('sd_customer_refresh',session['refresh_token'])]:
        response.set_cookie(name,value,max_age=7*86400,httponly=True,secure=secure,samesite='Strict',path='/')

def customer():
    token=request.cookies.get('sd_customer_access') or request.cookies.get('sd_access')
    if not token: abort(401,description='Zaloguj się, aby zapisać zamówienie.')
    try: user=supabase('/auth/v1/user',token=token)
    except RemoteError as error:
        refresh=request.cookies.get('sd_customer_refresh') if request.cookies.get('sd_customer_access') else request.cookies.get('sd_refresh')
        if error.status not in (401,403) or not refresh:abort(401,description='Sesja wygasła. Zaloguj się ponownie.')
        try:
            session=supabase('/auth/v1/token?grant_type=refresh_token','POST',data={'refresh_token':refresh})
            token=session['access_token'];user=supabase('/auth/v1/user',token=token)
            g.new_customer_session=session
        except RemoteError:abort(401,description='Sesja wygasła. Zaloguj się ponownie.')
    if not user.get('email_confirmed_at'):abort(403,description='Potwierdź adres e-mail.')
    g.customer_token,g.customer_user=token,user
    return user

@app.post('/api/customer/request-code')
def customer_code():
    import re
    payload=request.get_json()
    email=payload.get('email') if isinstance(payload,dict) else None
    if not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):abort(400,description='Podaj adres e-mail.')
    try:supabase('/auth/v1/otp','POST',data={'email':email.strip().lower(),'create_user':True})
    except RemoteError as e:
        if e.status==429:abort(429,description='Poczekaj chwilę przed kolejną prośbą o kod.')
        abort(502,description='Nie udało się wysłać kodu. Sprawdź konfigurację poczty w Supabase.')
    return jsonify(ok=True)

@app.post('/api/customer/verify-code')
def customer_verify():
    import re
    payload=request.get_json()
    if not isinstance(payload,dict):abort(400)
    email,code=payload.get('email'),payload.get('code')
    if not isinstance(email,str) or len(email)>254 or not isinstance(code,str) or not re.fullmatch(r'\d{6,10}',code):abort(400)
    try:session=supabase('/auth/v1/verify','POST',data={'email':email.strip().lower(),'token':code,'type':'email'})
    except RemoteError:abort(401,description='Kod jest nieprawidłowy lub wygasł.')
    response=jsonify(ok=True);set_customer_session(response,session);return response

@app.get('/api/customer/me')
def customer_me():
    user=customer();return jsonify(id=user['id'],email=user['email'],name=(user.get('user_metadata') or {}).get('first_name',''))

@app.post('/api/customer/logout')
def customer_logout():
    token=request.cookies.get('sd_customer_access')
    if token:
        try:supabase('/auth/v1/logout','POST',token=token,data={})
        except (RemoteError,HTTPException):pass
    response=jsonify(ok=True)
    for name in ('sd_customer_access','sd_customer_refresh'):response.delete_cookie(name,path='/')
    return response

@app.post('/api/orders')
def create_order():
    import uuid
    customer();payload=request.get_json()
    if not isinstance(payload,dict):abort(400)
    if payload.get('delivery') is not True:abort(400,description='Zaznacz prośbę o wysłanie raportu.')
    name=payload.get('name');product=payload.get('product');people=payload.get('people');report=payload.get('report')
    if not isinstance(name,str) or not 1<=len(name.strip())<=80 or product not in ('partnerski','rodzic-dziecko','rodzenstwo','kronika'):abort(400)
    if not isinstance(people,list) or not 2<=len(people)<=15 or not all(isinstance(p,dict) for p in people):abort(400)
    if not isinstance(report,dict) or not isinstance(report.get('sections'),list) or report.get('kind')!='relation':abort(400)
    if len(json.dumps(report).encode())>1000000:abort(413)
    try:rid=str(uuid.UUID(payload.get('request_id','')))
    except (ValueError,TypeError,AttributeError):abort(400)
    supabase('/auth/v1/user','PUT',token=g.customer_token,data={'data':{'first_name':name.strip()}})
    row=supabase('/rest/v1/rpc/sd_create_order','POST',token=g.customer_token,data={'p_request_id':rid,'p_name':name.strip(),'p_product':product,'p_input':people,'p_report':report,'p_delivery':True})
    if isinstance(row,list):row=row[0] if row else None
    if not row or not row.get('order_number'):abort(502,description='Baza nie potwierdziła zamówienia. Nie zamykaj formularza.')
    return jsonify(order_number=row['order_number'],id=row['id'],email=row['email'],payment_status=row['payment_status'],delivery_status=row['delivery_status'])

@app.get('/api/orders')
def my_orders():
    customer();return jsonify(supabase('/rest/v1/sd_orders?select=id,order_number,customer_name,email,product_id,payment_status,delivery_status,created_at&user_id=eq.'+g.customer_user['id']+'&order=created_at.desc&limit=100',token=g.customer_token))

@app.get('/api/orders/<uuid:order_id>')
def my_order(order_id):
    customer();rows=supabase('/rest/v1/sd_orders?select=*&id=eq.'+str(order_id)+'&user_id=eq.'+g.customer_user['id'],token=g.customer_token)
    if not rows:abort(404)
    return jsonify(rows[0])

@app.get('/api/admin/orders')
def staff_orders():
    staff();return jsonify(supabase('/rest/v1/sd_orders?select=id,order_number,customer_name,email,product_id,payment_status,delivery_status,created_at&order=created_at.desc&limit=100',token=g.token))

@app.get('/api/admin/orders/<uuid:order_id>')
def staff_order(order_id):
    staff();rows=supabase('/rest/v1/sd_orders?select=*&id=eq.'+str(order_id),token=g.token)
    if not rows:abort(404)
    return jsonify(rows[0])

@app.put('/api/admin/orders/<uuid:order_id>')
def edit_order_report(order_id):
    staff();payload=request.get_json();body=payload.get('report') if isinstance(payload,dict) else None
    if not isinstance(body,dict) or not isinstance(body.get('sections'),list) or len(json.dumps(body).encode())>1000000:abort(400)
    supabase('/rest/v1/rpc/sd_edit_order_report','POST',token=g.token,data={'p_id':str(order_id),'p_report':body})
    return jsonify(ok=True)

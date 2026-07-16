import asyncio,json,sqlite3,uuid,time,hashlib
from pathlib import Path
from fastapi import FastAPI,Body,Cookie,HTTPException
from fastapi.responses import JSONResponse,StreamingResponse,FileResponse
from fastapi.staticfiles import StaticFiles
ROOT=Path(__file__).parent; DB=ROOT/'djaga.db'; S={}; TOK={}
FEED=[{'scam_type':'Cloned voice','title':'Family emergency transfer calls','summary':'12 reports match cloned family voices demanding urgent transfers.','region':'Ipoh','lat':4.5975,'lng':101.0901,'source_name':'NACSA','source_url':'https://www.nacsa.gov.my','date':'2026-01-01'},{'scam_type':'Macau','title':'Fake officer calls','summary':'Callers pressure victims to act immediately.','region':'Kuala Lumpur','lat':3.139,'lng':101.6869,'source_name':'PDRM','source_url':'https://www.rmp.gov.my','date':'2026-01-01'},{'scam_type':'Investment','title':'Investment scheme alert','summary':'WhatsApp investment promises reported in Perak.','region':'Manjung','lat':4.21,'lng':100.65,'source_name':'Bernama','source_url':'https://bernama.com','date':'2026-01-01'}]
def con():
 c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute('create table if not exists users(id text primary key,email text unique,password text,name text,language text)');return c
app=FastAPI(); app.mount('/assets',StaticFiles(directory=ROOT/'frontend/dist/assets',check_dir=False),name='assets')
def user(t):
 if not t or t not in TOK:return None
 with con() as c:r=c.execute('select id,email,name,language from users where id=?',(TOK[t],)).fetchone()
 return dict(r) if r else None
def reply(u):
 t=str(uuid.uuid4());TOK[t]=u['id'];r=JSONResponse({'user':u});r.set_cookie('djaga_session',t,httponly=True,samesite='lax');return r
@app.post('/api/auth/register')
def reg(p:dict=Body(...)):
 u={'id':str(uuid.uuid4()),'email':p['email'],'name':p.get('name') or p['email'].split('@')[0],'language':'en'}
 try:
  with con() as c:c.execute('insert into users values(?,?,?,?,?)',(u['id'],u['email'],hashlib.sha256(p['password'].encode()).hexdigest(),u['name'],'en'))
 except: raise HTTPException(409,'Email already registered')
 return reply(u)
@app.post('/api/auth/login')
def login(p:dict=Body(...)):
 with con() as c:r=c.execute('select * from users where email=?',(p['email'],)).fetchone()
 if not r or r['password']!=hashlib.sha256(p['password'].encode()).hexdigest():raise HTTPException(401,'Invalid login')
 return reply(dict(r))
@app.post('/api/auth/mydigitalid')
def myid():
 u={'id':'mydigital','email':'verified@mydigital.demo','name':'Verified Malaysian','language':'en'}
 with con() as c:c.execute('insert or ignore into users values(?,?,?,?,?)',(u['id'],u['email'],'simulated',u['name'],'en'))
 return reply(u)
@app.get('/api/auth/me')
def me(djaga_session:str|None=Cookie(None)):return {'user':user(djaga_session)}
@app.post('/api/auth/logout')
def logout(djaga_session:str|None=Cookie(None)):
 TOK.pop(djaga_session,None);r=JSONResponse({'ok':True});r.delete_cookie('djaga_session');return r
@app.post('/api/profile/language')
def lang(p:dict=Body(...),djaga_session:str|None=Cookie(None)):
 u=user(djaga_session)
 if not u:raise HTTPException(401)
 with con() as c:c.execute('update users set language=? where id=?',(p['language'],u['id']))
 return {'language':p['language']}
@app.get('/api/feed')
def feed():return FEED
@app.post('/api/checks')
async def check(p:dict=Body(...)):
 i=str(uuid.uuid4());S[i]={'events':[],'verdict':None};asyncio.create_task(run(i,p.get('kind','call')));return {'session_id':i}
async def run(i,k):
 e=S[i]['events'];
 async def add(a,m,s=None):e.append({'type':'trace','agent':a,'ts':time.time(),'status':'evidence','message':m,'score':s})
 await add('intake','Audio received. Dispatching the investigation team.');await asyncio.sleep(3);await add('forensics','Synthetic voice artifacts detected.',.81);e.append({'type':'risk','agent':'forensics','ts':time.time(),'status':'evidence','message':'Risk rising','score':.42});await asyncio.sleep(5);await add('transcribe','Transcript: Please do not tell anyone. Transfer RM3,000 now.');await add('behavioral','Urgency, secrecy and payment pressure detected.',.86);e.append({'type':'risk','agent':'behavioral','ts':time.time(),'status':'evidence','message':'Caution','score':.68});await asyncio.sleep(5);await add('registry','3 related SemakMule reports (MOCK).',.55);await add('osint','7 online scam reports match this script.',.78);v={'risk':.77,'level':'danger','kind':k,'excerpt':'Please do not tell anyone. Transfer RM3,000 now.','flagged_phrases':['do not tell anyone','Transfer RM3,000 now.'],'evidence':[{'agent':'forensics','claim':'Cloned voice detected','weight_contribution':.2},{'agent':'behavioral','claim':'Urgency + secrecy pattern','weight_contribution':.3},{'agent':'registry','claim':'3 SemakMule reports (MOCK)','weight_contribution':.11},{'agent':'osint','claim':'7 matching reports','weight_contribution':.16}]};S[i]['verdict']=v;await add('verdict','This call may be a scam.',.77);e.append({'type':'risk','agent':'verdict','ts':time.time(),'status':'done','message':'Danger','score':.77,'evidence':v})
@app.get('/api/checks/{i}/stream')
async def stream(i:str):
 async def g():
  n=0
  while i in S:
   while n<len(S[i]['events']):x=S[i]['events'][n];n+=1;yield f"event: {x['type']}\ndata: {json.dumps(x)}\n\n"
   if S[i]['verdict']:break
   await asyncio.sleep(.5)
 return StreamingResponse(g(),media_type='text/event-stream')
@app.get('/api/checks/{i}/verdict')
def verdict(i:str):return S.get(i,{}).get('verdict') or {}
@app.get('/healthz')
def health():return {'ok':True,'agents':{x:'mock' for x in ['intake','forensics','transcribe','behavioral','registry','osint','verdict']}}
@app.get('/{path:path}')
def spa(path:str):return FileResponse(ROOT/'frontend/dist/index.html')

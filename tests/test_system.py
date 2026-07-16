import os
os.environ['DJAGA_DB_PATH']='/tmp/djaga-test.db'
os.environ['MOCK_DELAY_SCALE']='0'
# Tests must remain self-contained even when a developer has configured a
# Supabase connection in their local .env file.
os.environ['SUPABASE_DB_URL']=''
from fastapi.testclient import TestClient
from app import app
def test_auth_feed_and_mock_pipeline():
 with TestClient(app) as client:
  import uuid
  r=client.post('/api/auth/register',json={'email':f'{uuid.uuid4()}@example.com','password':'longpassword','name':'Test User'});assert r.status_code==200
  assert client.get('/api/feed').status_code==200
  started=client.post('/api/checks',json={'kind':'message'});assert started.status_code==200
  sid=started.json()['session_id'];assert client.post(f'/api/checks/{sid}/analyze',json={'text':'Transfer now'}).status_code==200
  import time
  for _ in range(20):
   verdict=client.get(f'/api/checks/{sid}/verdict').json()
   if verdict:break
   time.sleep(.02)
  assert verdict['level']=='danger'
  assert len(verdict['evidence'])>=2
def test_demo_stream_is_public():
 with TestClient(app) as client:
  response=client.get('/api/demo/stream');assert response.status_code==200

def test_chat_and_agent_failure_do_not_break_a_check(monkeypatch):
 from agents import _agents
 class BrokenOSINT:
  async def run(self, **kwargs): raise RuntimeError('simulated service outage')
 original=_agents['osint'];_agents['osint']=BrokenOSINT()
 try:
  with TestClient(app) as client:
   import uuid,time
   client.post('/api/auth/register',json={'email':f'{uuid.uuid4()}@example.com','password':'longpassword','name':'Test User'})
   sid=client.post('/api/checks',json={'kind':'message'}).json()['session_id']
   client.post(f'/api/checks/{sid}/analyze',json={'text':'Transfer money urgently'})
   for _ in range(30):
    verdict=client.get(f'/api/checks/{sid}/verdict').json()
    if verdict: break
    time.sleep(.02)
   assert verdict['risk'] > .6
   assert client.post('/api/chat',json={'message':'Any scams in Ipoh lately?'}).status_code==200
 finally:
  _agents['osint']=original

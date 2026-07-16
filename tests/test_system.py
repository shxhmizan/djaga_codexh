import os
os.environ['DJAGA_DB_PATH']='/tmp/djaga-test.db'
os.environ['MOCK_DELAY_SCALE']='0'
os.environ['IMAGE_FORENSICS_MODE']='mock'
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
  intelligence=client.get('/api/intelligence'); assert intelligence.status_code==200
  assert len(intelligence.json()['map_points']) >= 90
  assert len(intelligence.json()['insights']) >= 6
  analysis=client.post('/api/reports/analyze', json={'description':'A caller claiming to be PDRM asked me to transfer money urgently.'})
  assert analysis.status_code == 200 and analysis.json()['type'] == 'macau_scam'
  report=client.post('/api/reports', json={'description':'A caller claiming to be PDRM asked me to transfer money urgently.', 'location':'Ipoh', 'consent_public':True})
  assert report.status_code == 200 and report.json()['published'] is True
  identifier=client.post('/api/scam-check/identifier', json={'value': '0123456789'})
  assert identifier.status_code == 200 and identifier.json()['kind'] == 'phone'
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
  assert client.get('/healthz').json()['langgraph'] is True
  response=client.get('/api/demo/stream');assert response.status_code==200

def test_image_and_voice_upload_paths_emit_real_pipeline_events():
 with TestClient(app) as client:
  import uuid,time
  client.post('/api/auth/register',json={'email':f'{uuid.uuid4()}@example.com','password':'longpassword','name':'Test User'})
  for kind, files in (
   ('image', {'file': ('photo.png', b'png-bytes-received-by-the-pipeline', 'image/png')}),
   ('voice', {'file': ('note.wav', b'audio-bytes-received-by-the-pipeline', 'audio/wav')}),
  ):
   sid=client.post('/api/checks',json={'kind':kind}).json()['session_id']
   assert client.post(f'/api/checks/{sid}/analyze',files=files).status_code==200
   for _ in range(30):
    verdict=client.get(f'/api/checks/{sid}/verdict').json()
    if verdict: break
    time.sleep(.02)
   assert verdict['kind']==kind and verdict['evidence']
   stream=client.get(f'/api/checks/{sid}/stream')
   assert 'event: trace' in stream.text and 'event: risk' in stream.text

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

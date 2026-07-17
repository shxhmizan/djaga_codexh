import os
os.environ['DJAGA_DB_PATH']='/tmp/djaga-test.db'
os.environ['MOCK_DELAY_SCALE']='0'
os.environ['IMAGE_FORENSICS_MODE']='mock'
os.environ['OSINT_MODE']='mock'
os.environ['FORENSICS_AGENT_MODE']='mock'
os.environ['TRANSCRIBE_AGENT_MODE']='mock'
os.environ['OPENROUTER_API_KEY']=''
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
  assert len(intelligence.json()['map_points']) >= 5
  assert intelligence.json()['live_stats'][0]['activeAlerts'] == len(intelligence.json()['map_points'])
  assert intelligence.json()['insights']
  assert intelligence.json()['insights'][0]['sources']
  assert intelligence.json()['insights'][0]['engine'] == 'feed-derived'
  analysis=client.post('/api/reports/analyze', json={'description':'A caller claiming to be PDRM asked me to transfer money urgently.'})
  assert analysis.status_code == 200 and analysis.json()['type'] == 'macau_scam'
  report=client.post('/api/reports', json={'description':'A caller claiming to be PDRM asked me to transfer money urgently.', 'location':'Ipoh', 'consent_public':True})
  assert report.status_code == 200 and report.json()['published'] is True
  identifier=client.post('/api/scam-check/identifier', json={'value': '0123456789'})
  assert identifier.status_code == 200 and identifier.json()['kind'] == 'phone'
  known_identifier=client.post('/api/scam-check/identifier', json={'value': '0104269914'})
  assert known_identifier.status_code == 200
  assert known_identifier.json()['level'] == 'danger' and known_identifier.json()['top_match']['reports'] == 21
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

def test_scam_check_upload_and_top_identifier_use_message_pipeline():
 with TestClient(app) as client:
  import uuid,time
  client.post('/api/auth/register',json={'email':f'{uuid.uuid4()}@example.com','password':'longpassword','name':'Test User'})
  sid=client.post('/api/checks',json={'kind':'message'}).json()['session_id']
  upload={'file': ('conversation.txt', b'Please transfer RM3000 now to 0104269914. This is urgent.', 'text/plain')}
  assert client.post(f'/api/checks/{sid}/analyze',files=upload).status_code==200
  for _ in range(30):
   verdict=client.get(f'/api/checks/{sid}/verdict').json()
   if verdict: break
   time.sleep(.02)
  registry=[item for item in verdict['evidence'] if item['agent']=='registry'][0]
  assert verdict['level']=='danger'
  assert 'Top 10 database match' in registry['claim']

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

def test_profile_management_endpoints_persist_changes():
 with TestClient(app) as client:
  import uuid
  email = f'{uuid.uuid4()}@example.com'
  assert client.post('/api/auth/register',json={'email':email,'password':'longpassword','name':'Original Name'}).status_code == 200
  profile = client.patch('/api/profile', json={'name':'Updated Name'})
  assert profile.status_code == 200 and profile.json()['user']['name'] == 'Updated Name'
  saved = client.put('/api/profile/settings', json={'scam_alerts':False,'private_analysis':True,'email_updates':False})
  assert saved.status_code == 200 and saved.json() == {'scam_alerts':False,'private_analysis':True,'email_updates':False}
  assert client.get('/api/profile/settings').json()['private_analysis'] is True
  assert client.post('/api/profile/password',json={'current_password':'longpassword','new_password':'evenlongerpassword'}).status_code == 200
  assert client.delete('/api/profile/history').status_code == 200


def test_profile_detection_status_endpoint_is_available_under_api_prefix():
 with TestClient(app) as client:
  health = client.get('/api/healthz')
  assert health.status_code == 200
  assert health.json()['ok'] is True
  assert 'agents' in health.json()

def test_elevenlabs_voice_configuration_requires_login_only():
 with TestClient(app) as client:
  assert client.get('/api/elevenlabs/conversation').status_code == 401
  import uuid
  client.post('/api/auth/register',json={'email':f'{uuid.uuid4()}@example.com','password':'longpassword','name':'Test User'})
  config = client.get('/api/elevenlabs/conversation')
  assert config.status_code == 200 and config.json()['agent_id'].startswith('agent_')


def test_elevenlabs_knowledge_base_snapshot_is_public_text():
 with TestClient(app) as client:
  response = client.get('/api/elevenlabs/knowledge-base.txt')
  assert response.status_code == 200
  assert response.headers['content-type'].startswith('text/plain')
  assert 'DJAGA — Malaysian Scam Intelligence Snapshot' in response.text


def test_image_verdict_preserves_the_actual_model_posterior():
 from agents.verdict import VerdictAgent
 from contracts import AgentResult
 verdict = VerdictAgent().compose(
  kind='image',
  results={
   'image_forensics': AgentResult(
    agent='image_forensics', score=.29,
   payload={
     'claim':'Classifier returned real: 71%; synthetic-image probability is 29%.',
     'synthetic_probability':.29,
     'top_label':'real',
     'top_label_probability':.71,
     'model':'test-model',
     'provider':'openrouter',
    },
   ),
  },
 )
 image_evidence = verdict.evidence[0]
 assert image_evidence['details']['top_label'] == 'real'
 assert image_evidence['details']['synthetic_probability'] == .29
 assert image_evidence['details']['provider'] == 'openrouter'


def test_openrouter_voice_result_is_schema_checked():
 from integrations.openrouter_client import _voice_analysis_result
 result = _voice_analysis_result({
  'acoustic_score': .41,
  'transcript': 'Please transfer RM300 now.',
  'voice_summary': 'The caller asks the listener to transfer money.',
  'patterns': ['payment pressure'],
  'artifacts': ['short clip'],
  'claim': 'The clip contains a request for money.',
 })
 assert result['acoustic_score'] == .41
 assert result['transcript'].startswith('Please transfer')
 assert result['voice_summary'].startswith('The caller asks')

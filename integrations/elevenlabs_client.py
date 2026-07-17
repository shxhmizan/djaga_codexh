from __future__ import annotations
import httpx
from fastapi import HTTPException
from fastapi.responses import Response
from config import settings

async def conversation_config() -> dict:
 """Return a public agent ID or a short-lived signed URL for a private agent."""
 if not settings.elevenlabs_agent_id:
  raise HTTPException(503,'ELEVENLABS_AGENT_ID is not configured')
 if not settings.elevenlabs_api_key:
  # Public agents can connect from the React SDK with only their agent ID.
  # Private agents must configure an API key so this server can sign the URL.
  return {'agent_id':settings.elevenlabs_agent_id,'branch_id':settings.elevenlabs_branch_id or None,'authorization':'public'}
 params={'agent_id':settings.elevenlabs_agent_id,'include_conversation_id':'true'}
 if settings.elevenlabs_branch_id: params['branch_id']=settings.elevenlabs_branch_id
 async with httpx.AsyncClient(timeout=30) as client:
  res=await client.get('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url',headers={'xi-api-key':settings.elevenlabs_api_key},params=params)
  if not res.is_success:
   detail=res.text[:300]
   raise HTTPException(502,f'ElevenLabs could not create a voice session: {detail}')
  signed_url=res.json().get('signed_url')
 if not signed_url: raise HTTPException(502,'ElevenLabs did not return a signed conversation URL')
 return {'agent_id':settings.elevenlabs_agent_id,'branch_id':settings.elevenlabs_branch_id or None,'signed_url':signed_url,'authorization':'signed'}
async def transcribe_audio(audio:bytes,content_type:str)->str:
 if not settings.elevenlabs_api_key: raise RuntimeError('ELEVENLABS_API_KEY is not configured; transcribe agent should use mock mode')
 headers={'xi-api-key':settings.elevenlabs_api_key}
 extension={"audio/mp4":"m4a","audio/x-m4a":"m4a","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/webm":"webm","audio/ogg":"ogg"}.get(content_type,"m4a")
 files={'file':(f'recording.{extension}',audio,content_type)}
 data={'model_id':'scribe_v1','language_code':'ms'}
 async with httpx.AsyncClient(timeout=60) as client:
  res=await client.post('https://api.elevenlabs.io/v1/speech-to-text',headers=headers,files=files,data=data);res.raise_for_status();payload=res.json()
 transcript=(payload.get('text') or '').strip()
 if not transcript: raise RuntimeError('ElevenLabs Scribe returned an empty transcript')
 return transcript
async def synthesize(text:str)->Response:
 if not settings.elevenlabs_api_key or not settings.el_voice_id: raise HTTPException(503,'ElevenLabs TTS is not configured')
 async with httpx.AsyncClient(timeout=60) as client:
  res=await client.post(f'https://api.elevenlabs.io/v1/text-to-speech/{settings.el_voice_id}',headers={'xi-api-key':settings.elevenlabs_api_key,'accept':'audio/mpeg','content-type':'application/json'},json={'text':text,'model_id':'eleven_multilingual_v2'});res.raise_for_status()
 return Response(res.content,media_type='audio/mpeg')

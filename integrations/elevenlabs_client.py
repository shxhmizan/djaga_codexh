from __future__ import annotations
import httpx
from fastapi import HTTPException
from fastapi.responses import Response
from config import settings
async def transcribe_audio(audio:bytes,content_type:str)->str:
 if not settings.elevenlabs_api_key: raise RuntimeError('ELEVENLABS_API_KEY is not configured; transcribe agent should use mock mode')
 headers={'xi-api-key':settings.elevenlabs_api_key}
 files={'file':('recording.m4a',audio,content_type)}
 data={'model_id':'scribe_v1','language_code':'ms'}
 async with httpx.AsyncClient(timeout=60) as client:
  res=await client.post('https://api.elevenlabs.io/v1/speech-to-text',headers=headers,files=files,data=data);res.raise_for_status();payload=res.json()
 return payload.get('text','')
async def synthesize(text:str)->Response:
 if not settings.elevenlabs_api_key or not settings.el_voice_id: raise HTTPException(503,'ElevenLabs TTS is not configured')
 async with httpx.AsyncClient(timeout=60) as client:
  res=await client.post(f'https://api.elevenlabs.io/v1/text-to-speech/{settings.el_voice_id}',headers={'xi-api-key':settings.elevenlabs_api_key,'accept':'audio/mpeg','content-type':'application/json'},json={'text':text,'model_id':'eleven_multilingual_v2'});res.raise_for_status()
 return Response(res.content,media_type='audio/mpeg')

from config import settings
import mock_agents
from integrations.elevenlabs_client import transcribe_audio
from integrations.huggingface_audio import transcribe_local_audio
from contracts import AgentResult
class TranscribeAgent:
 async def run(self,**kwargs):
  if settings.agent_mode_for('transcribe')=='real' and kwargs.get('blob'):
   # Scribe is preferred because it accepts iPhone M4A directly. The local
   # Whisper path makes a genuinely analysed, keyless development install
   # possible for WAV/OGG audio when ElevenLabs is not configured.
   if settings.elevenlabs_api_key:
    transcript=await transcribe_audio(kwargs['blob'],kwargs.get('content_type') or 'audio/mp4')
   else:
    transcript=await transcribe_local_audio(kwargs['blob'],kwargs.get('content_type') or 'audio/wav')
   return AgentResult(agent='transcribe',payload={'transcript':transcript})
  return await mock_agents.transcribe(**kwargs)

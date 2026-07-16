from config import settings
import mock_agents
from integrations.elevenlabs_client import transcribe_audio
from contracts import AgentResult
class TranscribeAgent:
 async def run(self,**kwargs):
  if settings.agent_mode_for('transcribe')=='real' and kwargs.get('blob'):
   transcript=await transcribe_audio(kwargs['blob'],kwargs.get('content_type') or 'audio/mp4')
   return AgentResult(agent='transcribe',payload={'transcript':transcript})
  return await mock_agents.transcribe(**kwargs)

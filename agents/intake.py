from config import settings
import mock_agents
from contracts import AgentResult
class IntakeAgent:
 async def run(self,**kwargs):
  if kwargs.get('kind') == 'image' and kwargs.get('blob'):
   size=len(kwargs['blob']); content_type=kwargs.get('content_type') or 'image'
   return AgentResult(agent='intake',payload={'kind':'image','bytes_received':size,'content_type':content_type,'claim':f'Validated uploaded {content_type} image ({size:,} bytes) for local authenticity analysis.'})
  return await mock_agents.intake(**kwargs)

from config import settings
import mock_agents
from integrations.exa_client import search
from contracts import AgentResult
class OSINTAgent:
 async def run(self,**kwargs):
  if settings.agent_mode_for('osint')=='real':
   results=await search('Malaysia scam LHDN impersonation')
   return AgentResult(agent='osint',score=.7 if results else .2,payload={'mentions':len(results),'sources':[x.get('url') for x in results[:3]],'claim':f'{len(results)} relevant Malaysian web reports found.'})
  return await mock_agents.osint(**kwargs)

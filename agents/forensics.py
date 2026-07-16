from config import settings
import mock_agents
from contracts import AgentResult
class ForensicsAgent:
 async def run(self,**kwargs):
  # Real anti-spoof endpoint is intentionally isolated here for a serving-model swap.
  return await mock_agents.forensics(**kwargs)

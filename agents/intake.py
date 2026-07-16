from config import settings
import mock_agents
class IntakeAgent:
 async def run(self,**kwargs): return await mock_agents.intake(**kwargs)

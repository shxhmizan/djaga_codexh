from config import settings
import mock_agents
from integrations.databricks_client import classify
class BehavioralAgent:
 async def run(self,**kwargs):
  if settings.agent_mode_for('behavioral')=='real': return await classify(kwargs.get('text') or '')
  return await mock_agents.behavioral(**kwargs)

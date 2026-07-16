import mock_agents
from config import settings
from integrations.semakmule_mock import lookup
class RegistryAgent:
 async def run(self,**kwargs):
  # Vector Search can be added behind this adapter; SemakMule remains mock by policy.
  return await mock_agents.registry(**kwargs)

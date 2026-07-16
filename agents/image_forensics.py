import mock_agents
class ImageForensicsAgent:
 async def run(self,**kwargs):
  # Seam for a future HF/Databricks image-authenticity model.
  return await mock_agents.image_forensics(**kwargs)

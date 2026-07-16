from __future__ import annotations
import httpx
from config import settings
from contracts import AgentResult
async def classify(text:str)->AgentResult:
 if not settings.serving_endpoint: raise RuntimeError('SERVING_ENDPOINT is required for real behavioral mode')
 async with httpx.AsyncClient(timeout=45) as client:
  res=await client.post(settings.serving_endpoint,json={'inputs':[text]});res.raise_for_status();data=res.json()
 score=float(data.get('score',data.get('predictions',[{}])[0].get('score',.5)))
 return AgentResult(agent='behavioral',score=score,payload={'claim':'Databricks classifier scored this message.','raw':data})

from __future__ import annotations
import httpx
from config import settings
async def search(query:str,num_results:int=5)->list[dict]:
 if not settings.exa_api_key: return []
 async with httpx.AsyncClient(timeout=30) as client:
  res=await client.post('https://api.exa.ai/search',headers={'x-api-key':settings.exa_api_key,'content-type':'application/json'},json={'query':query,'type':'auto','numResults':num_results,'contents':{'text':{'maxCharacters':1200}}});res.raise_for_status();return res.json().get('results',[])

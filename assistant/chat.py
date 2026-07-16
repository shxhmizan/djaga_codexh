from __future__ import annotations
import json,time
import httpx
from assistant.tools import check_entity,search_feed,user_checks,explain_verdict
from config import settings
from contracts import TraceEvent, User
from db import add_chat

def mock_reply(user:User,message:str)->tuple[str,str|None]:
 q=message.lower()
 if any(word in q for word in ('ipoh','feed','lately','latest')):
  found=search_feed('Ipoh') if 'ipoh' in q else search_feed('')
  summary='; '.join(f"{x['title']} in {x['region']}" for x in found[:3]) or 'No matching alerts are in your current feed.'
  return f"I checked DJAGA’s scam feed: {summary}. Treat urgent payment requests as suspicious and verify through an official number.","search_feed"
 if any(word in q for word in ('number','lhdn','bank','entity','check')):
  entity='LHDN' if 'lhdn' in q else message
  result=check_entity(entity)
  return f"I checked {entity}. DJAGA intelligence found {result['registry']['report_count']} related records and {len(result['reports'])} relevant feed items. Do not share OTPs or transfer money before independently verifying.","check_entity"
 if 'past check' in q or 'history' in q:
  checks=user_checks(user.id);return f"You have {len(checks)} saved checks. Your newest check is {checks[0]['level'] if checks and checks[0].get('level') else 'still processing'}.","get_user_checks"
 if 'verdict' in q:
  checks=user_checks(user.id)
  if checks and checks[0].get('id'):
   verdict=explain_verdict(checks[0]['id'])
   return (f"The latest verdict is {verdict['level']} at {round(verdict['risk']*100)}% risk. It was driven by " + ', '.join(x['claim'] for x in verdict['evidence'][:2]) + '.',"explain_verdict") if verdict else ("Your latest check has not completed yet.","explain_verdict")
 return "I’m DJAGA, your Malaysian scam-safety assistant. I can check the feed, look up a claimed entity, explain a past verdict, or help you decide what to scan. If someone pressures you to act now, pause and verify through an official channel.",None

async def stream_reply(user:User,message:str):
    add_chat(user.id,'user',message)
    reply,tool=mock_reply(user,message)
    # A Databricks OpenAI-compatible serving endpoint can replace the local assistant
    # without changing the SSE contract. Mock mode deliberately remains keyless.
    if settings.agent_mode == 'real' and settings.chat_endpoint:
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response=await client.post(settings.chat_endpoint,json={'messages':[{'role':'system','content':f'You are DJAGA, a warm Malaysian scam-safety expert. Reply in {user.language}.'},{'role':'user','content':message}]})
                response.raise_for_status();data=response.json()
                reply=data.get('choices',[{}])[0].get('message',{}).get('content') or data.get('response') or reply
        except Exception:
            # A configured service outage should never remove in-app safety guidance.
            pass
    words=reply.split(' ');built=[]
    for word in words:
        built.append(word)
        event=TraceEvent(type='chat',agent='assistant',ts=time.time(),status='evidence',message=word+' ',evidence={'tool_used':tool} if tool else None)
        yield f"event: chat\ndata: {event.model_dump_json()}\n\n"
        import asyncio;await asyncio.sleep(.018)
    add_chat(user.id,'assistant',reply)
    final=TraceEvent(type='chat',agent='assistant',ts=time.time(),status='done',message=reply,evidence={'tool_used':tool,'complete':True})
    yield f"event: chat\ndata: {final.model_dump_json()}\n\n"

from __future__ import annotations
import asyncio
import re
import time
import httpx
from agents.osint import OSINTAgent, extract_entities
from assistant.tools import check_entity, search_feed, user_checks, explain_verdict, voice_grounding_context
from db import registry_candidates
from config import settings
from contracts import TraceEvent, User
from db import add_chat

_SCAM_SIGNALS = {
    "urgency": ("urgent", "immediately", "now", "today", "cepat", "segera"),
    "payment pressure": ("transfer", "bank in", "deposit", "payment", "duit", "rm"),
    "credential request": ("otp", "tac", "password", "pin", "verify code"),
    "authority impersonation": ("police", "polis", "pdrm", "lhdn", "bank negara", "officer"),
    "secrecy": ("do not tell", "don't tell", "secret", "jangan beritahu"),
}


async def _reason_about_attempt(message: str) -> tuple[str, str]:
    """Use persisted intelligence and, when enabled, the live OSINT agent.

    This deliberately never claims web research in zero-key mode.  The local
    result is based on the submitted words plus records in DJAGA's database.
    """
    lowered = message.lower()
    patterns = [name for name, words in _SCAM_SIGNALS.items() if any(word in lowered for word in words)]
    records = registry_candidates(message)
    entities = extract_entities(message)
    live_sources = []
    if settings.agent_mode_for("osint") == "real" and settings.exa_api_key and entities:
        try:
            result = await OSINTAgent().run(text=message, kind="message")
            live_sources = result.payload.get("sources", []) if not result.unavailable else []
        except Exception:
            # A research outage must not stop the assistant from giving safety advice.
            live_sources = []

    facts: list[str] = []
    if patterns:
        facts.append("I found " + ", ".join(patterns) + " in what you described")
    if records:
        facts.append(f"DJAGA's stored intelligence has {len(records)} related record{'s' if len(records) != 1 else ''}")
    if live_sources:
        facts.append(f"the live research agent found {len(live_sources)} relevant public source{'s' if len(live_sources) != 1 else ''}")
    if facts:
        lead = "; ".join(facts) + "."
        urgency = " Do not transfer money, share an OTP/TAC, or install any app."
        if any(token in lowered for token in ("bank", "transfer", "account", "otp", "tac")):
            urgency += " If money or banking access may be at risk, contact your bank using the official number on its card or website, then call NSRC at 997."
        else:
            urgency += " Pause the conversation and verify the person through a number you find independently."
        return lead + urgency, "agent_reasoning"
    return "I do not see a clear scam signal in that description yet. Please tell me who contacted you, what they asked you to do, whether a link, phone number, or bank account was involved, and whether they created urgency.", "agent_reasoning"


async def assistant_reply(user:User,message:str)->tuple[str,str|None]:
 q=message.lower()
 region = next((name for name in ('ipoh', 'sabah', 'sarawak', 'kuching', 'kota kinabalu', 'kuala lumpur', 'penang', 'manjung', 'alor setar') if name in q), '')
 if any(word in q for word in ('ipoh','sabah','sarawak','kuching','kota kinabalu','feed','lately','latest','report')):
  found=search_feed(region.title() if region else '')
  summary='; '.join(f"{x['title']} in {x['region']}" for x in found[:3]) or 'No matching alerts are in your current feed.'
  return f"I checked DJAGA’s stored scam feed: {summary}. Treat urgent payment requests as suspicious and verify through an official number.","search_feed"
 if any(any(word in q for word in words) for words in _SCAM_SIGNALS.values()):
  return await _reason_about_attempt(message)
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
 if any(word in q for word in ("report", "scam", "called", "message", "link", "transfer", "otp", "tac", "parcel", "job", "investment")):
  return await _reason_about_attempt(message)
 return "I’m DJAGA, your Malaysian scam-safety assistant. Tell me what happened and I will check scam-language signals, stored reports, your past checks, and—when configured—live public research. If someone pressures you to act now, pause and verify through an official channel.",None


async def _api_enriched_reply(user: User, message: str, grounded_reply: str) -> str:
    """Let configured LLM services explain, never replace, DJAGA evidence.

    The database/agent answer is generated first.  A configured Databricks
    endpoint or OpenRouter model may make it clearer, but receives explicit
    source context and is prohibited from inventing reports, findings, or
    emergency contact details.
    """
    context = voice_grounding_context(message)["context"][:5000]
    system = (
        "You are DJAGA, a careful Malaysian scam-safety assistant. Rewrite the "
        "grounded answer in warm, plain English (maximum 150 words). Use only the "
        "facts in the grounded answer and public-feed context. Do not invent report "
        "counts, sources, government instructions, or results. Preserve urgent safety "
        "advice such as independently contacting a bank and NSRC 997 when present."
    )
    prompt = f"User question:\n{message[:3000]}\n\nGrounded DJAGA answer:\n{grounded_reply}\n\nCurrent public feed context:\n{context}"
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            if settings.chat_endpoint:
                response = await client.post(settings.chat_endpoint, json={"messages": [
                    {"role": "system", "content": system}, {"role": "user", "content": prompt},
                ]})
            elif settings.openrouter_api_key:
                response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}", "Content-Type": "application/json",
                }, json={"model": settings.openrouter_model, "messages": [
                    {"role": "system", "content": system}, {"role": "user", "content": prompt},
                ], "temperature": 0.2})
            else:
                return grounded_reply
            response.raise_for_status()
            data = response.json()
        answer = data.get("choices", [{}])[0].get("message", {}).get("content") or data.get("response")
        return str(answer).strip()[:1800] or grounded_reply
    except Exception:
        # API outages never remove grounded safety guidance.
        return grounded_reply

async def stream_reply(user:User,message:str):
    add_chat(user.id,'user',message)
    reply,tool=await assistant_reply(user,message)
    reply = await _api_enriched_reply(user, message, reply)
    words=reply.split(' ');built=[]
    for word in words:
        built.append(word)
        event=TraceEvent(type='chat',agent='assistant',ts=time.time(),status='evidence',message=word+' ',evidence={'tool_used':tool} if tool else None)
        yield f"event: chat\ndata: {event.model_dump_json()}\n\n"
        await asyncio.sleep(.018)
    add_chat(user.id,'assistant',reply)
    final=TraceEvent(type='chat',agent='assistant',ts=time.time(),status='done',message=reply,evidence={'tool_used':tool,'complete':True})
    yield f"event: chat\ndata: {final.model_dump_json()}\n\n"

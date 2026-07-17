from __future__ import annotations
from db import get_feed, get_recent_feed, get_verdict, list_checks, registry_candidates
def search_feed(query:str):
 items=get_feed(limit=20);q=query.lower()
 return [item for item in items if q in (item['title']+item['summary']+item['region']+item['scam_type']).lower()]
def check_entity(entity:str):
 records = registry_candidates(entity)
 return {'entity':entity,'registry':{'report_count':len(records),'matches':records},'reports':search_feed(entity)}
def user_checks(user_id:str): return list_checks(user_id)
def explain_verdict(check_id:str): return get_verdict(check_id)

def voice_grounding_context(query: str = "") -> dict:
 """Small, source-cited public context safe to send to a voice provider.

 The source is the application's database (Supabase when configured), not a
 frontend fixture.  Personal checks and user data intentionally stay out of
 this payload.
 """
 records = get_recent_feed(days=7, limit=30)
 query = query.strip().lower()
 if query:
  terms = [term for term in query.split() if len(term) >= 3]
  matching = [row for row in records if any(term in f"{row['title']} {row['summary']} {row['region']} {row['scam_type']}".lower() for term in terms)]
  if matching:
   records = matching
 reports = [{
  "title": row["title"], "type": row["scam_type"], "region": row["region"],
  "date": row["date"], "summary": row["summary"], "source_url": row["source_url"],
 } for row in records[:8]]
 lines = [f"{item['date']} | {item['region']} | {item['type']}: {item['title']} — {item['summary']}" for item in reports]
 return {"window_days": 7, "report_count": len(reports), "reports": reports, "context": "\n".join(lines) or "No current public feed reports matched the query."}


def knowledge_base_snapshot() -> str:
 """Readable public intelligence snapshot for an ElevenLabs Knowledge Base.

 The content is deliberately public-feed only. It never contains user checks,
 private reports, contact details, or any credential for Supabase.
 """
 records = get_recent_feed(days=7, limit=80)
 header = [
  "DJAGA — Malaysian Scam Intelligence Snapshot",
  "This document contains public, unverified community and advisory intelligence from the last 7 days.",
  "Use it for safety guidance, not as proof that a specific person or number is fraudulent.",
  "For an urgent transfer, tell the user to contact their bank through its official number and call NSRC 997.",
  "",
  f"Reports in this snapshot: {len(records)}",
  "",
 ]
 if not records:
  return "\n".join(header + ["No current public reports are available."])
 entries = []
 for index, row in enumerate(records, 1):
  entries.extend([
   f"{index}. {row['title']}",
   f"Type: {row['scam_type']} | Area: {row['region']} | Reported: {row['date']}",
   f"Summary: {row['summary']}",
   f"Reference: {row['source_url']}",
   "",
  ])
 return "\n".join(header + entries)

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

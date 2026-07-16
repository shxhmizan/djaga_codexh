from __future__ import annotations
from db import get_feed, get_verdict, list_checks, registry_candidates
def search_feed(query:str):
 items=get_feed(limit=20);q=query.lower()
 return [item for item in items if q in (item['title']+item['summary']+item['region']+item['scam_type']).lower()]
def check_entity(entity:str):
 records = registry_candidates(entity)
 return {'entity':entity,'registry':{'report_count':len(records),'matches':records},'reports':search_feed(entity)}
def user_checks(user_id:str): return list_checks(user_id)
def explain_verdict(check_id:str): return get_verdict(check_id)

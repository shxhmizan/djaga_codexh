"""Hourly Exa harvester. With no Exa credential, it keeps curated transparent seed intelligence available."""
from __future__ import annotations
import asyncio
from datetime import date
from contracts import FeedItem
from db import upsert_feed
from integrations.exa_client import search

CITIES={'ipoh':(4.5975,101.0901,'Ipoh'),'kuala lumpur':(3.139,101.6869,'Kuala Lumpur'),'kl':(3.139,101.6869,'Kuala Lumpur'),'manjung':(4.210,100.650,'Manjung'),'penang':(5.4164,100.3327,'Penang'),'george town':(5.4164,100.3327,'Penang'),'alor setar':(6.1248,100.3678,'Alor Setar')}
SEED=[
 FeedItem(scam_type='Cloned voice',title='Family emergency transfer calls reported',summary='Reports describe cloned family voices demanding an urgent transfer.',region='Ipoh',lat=4.5975,lng=101.0901,source_name='DJAGA mock intelligence',source_url='https://www.rmp.gov.my',date='2026-07-16'),
 FeedItem(scam_type='Macau',title='Fake officer calls target residents',summary='Callers claim accounts are under investigation and demand immediate action.',region='Kuala Lumpur',lat=3.139,lng=101.6869,source_name='DJAGA mock intelligence',source_url='https://www.rmp.gov.my',date='2026-07-16'),
 FeedItem(scam_type='Investment',title='WhatsApp investment promise alert',summary='High-return investment messages are circulating in local groups.',region='Manjung',lat=4.210,lng=100.650,source_name='DJAGA mock intelligence',source_url='https://www.nacsa.gov.my',date='2026-07-15'),
 FeedItem(scam_type='Romance',title='Romance scam payment requests',summary='Victims report rapid relationship escalation followed by financial requests.',region='Penang',lat=5.4164,lng=100.3327,source_name='DJAGA mock intelligence',source_url='https://www.mycert.org.my',date='2026-07-15'),
 FeedItem(scam_type='Phishing',title='Bank verification links circulating',summary='Messages imitate bank notices and lead to credential-harvesting pages.',region='Alor Setar',lat=6.1248,lng=100.3678,source_name='DJAGA mock intelligence',source_url='https://www.mycert.org.my',date='2026-07-14'),
]
def _classify(text:str)->str:
 text=text.lower();return 'Investment' if 'invest' in text else 'Phishing' if 'phish' in text or 'link' in text else 'Macau' if 'police' in text or 'officer' in text else 'Cloned voice' if 'voice' in text else 'Other'
async def live_items()->list[FeedItem]:
 results=[]
 for query in ['Malaysia scam alert site:rmp.gov.my','Malaysia scam advisory site:nacsa.gov.my','Malaysia phone scam news']:
  results.extend(await search(query,4))
 items=[]
 for result in results:
  text=(result.get('title','')+' '+result.get('text',''));lower=text.lower();loc=next((CITIES[k] for k in CITIES if k in lower),(3.139,101.6869,'Kuala Lumpur'))
  items.append(FeedItem(scam_type=_classify(text),title=result.get('title','Malaysian scam advisory'),summary=(result.get('text') or 'Public scam advisory')[:360],region=loc[2],lat=loc[0],lng=loc[1],source_name=result.get('author') or 'Public advisory',source_url=result.get('url','https://www.rmp.gov.my'),date=date.today().isoformat()))
 return items
def harvest(seed_only:bool=False)->dict:
 items=SEED if seed_only else asyncio.run(live_items())
 if not items:items=SEED
 return {'ok':True,'added':upsert_feed(items),'items_checked':len(items),'mode':'live' if items is not SEED else 'mock'}
if __name__=='__main__':print(harvest())

"""SemakMule has no public API and is CAPTCHA protected. This adapter is intentionally MOCK-only."""
def lookup(value:str)->dict:
 return {'mock':True,'report_count':3,'matches':['Seeded fake officer-transfer report'],'message':'SemakMule MOCK — no official public API is queried.'}

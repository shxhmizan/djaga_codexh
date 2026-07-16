"""One-time migration of legacy frontend fixture data into the application database.

The UI no longer imports these fixture modules.  This script intentionally reads them
once so existing demo intelligence can be preserved in Supabase instead of being
embedded in the browser bundle.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from contracts import FeedItem
from db import get_intelligence, upsert_feed, upsert_intelligence

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

EXPORT_SCRIPT = r'''
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[1];
const load = name => import(pathToFileURL(path.join(root, 'src', 'data', name)).href);
const [map, insights, feed, gov, trust] = await Promise.all([
  load('dummyMapData.js'), load('dummyAIInsights.js'), load('dummyScamFeed.js'),
  load('dummyGovCheck.js'), load('dummyTrustScore.js'),
]);
console.log(JSON.stringify({
  map_points: map.SCAM_POINTS.map((point, index) => ({ id: `point-${index + 1}`, ...point })),
  scam_types: Object.entries(map.SCAM_TYPES).map(([id, value]) => ({ id, ...value })),
  city_stats: map.CITY_STATS.map(item => ({ id: item.city.toLowerCase().replaceAll(' ', '-'), ...item })),
  insights: insights.AI_INSIGHTS.map(item => ({ ...item, generatedAt: new Date(item.generatedAt).toISOString() })),
  live_stats: [{ id: 'current', ...insights.LIVE_STATS }],
  feed: feed.SCAM_FEED,
  gov_checks: gov.GOV_CHECKS,
  trust_breakdown: [{ id: 'default', ...trust.TRUST_BREAKDOWN }],
  top_accounts: [['512802774281',47],['17900052144',20],['26700077605',15],['1013041100083926',15],['26444100022578',14],['25810500018077',14],['21220000087743',13],['8881032092097',12],['4946775140',11]].map(([identifier,reports],index)=>({id:`account-${index+1}`,identifier,reports})),
  top_phones: [['0104269914',21],['0179764986',17],['01123520121',15],['01161051865',9],['0163411403',9],['0142897177',9],['0142472412',9],['01125054956',9],['0142447614',8],['28042221522',8]].map(([identifier,reports],index)=>({id:`phone-${index+1}`,identifier,reports})),
  monthly_trend: [{month:'Feb',value:412},{month:'Mar',value:505},{month:'Apr',value:468},{month:'May',value:621},{month:'Jun',value:714},{month:'Jul',value:847}].map(item=>({id:item.month.toLowerCase(),...item})),
}));
'''

COORDINATES = {
    "Kuala Lumpur": (3.1390, 101.6869), "Selangor": (3.0738, 101.5183),
    "Nationwide": (4.2105, 108.9758), "Johor": (1.4927, 103.7414),
    "Penang": (5.4164, 100.3327), "Petaling Jaya": (3.1073, 101.6376),
}


def _text(value: object) -> str:
    return value.get("en", "") if isinstance(value, dict) else str(value or "")


def migrate() -> dict[str, int]:
    output = subprocess.run(
        ["node", "--input-type=module", "-e", EXPORT_SCRIPT, str(FRONTEND)],
        check=True, cwd=ROOT, capture_output=True, text=True,
    )
    payload = json.loads(output.stdout)
    counts: dict[str, int] = {}
    for kind, records in payload.items():
        if kind == "feed":
            continue
        counts[kind] = upsert_intelligence(kind, records)

    items = []
    for alert in payload["feed"]:
        region = _text(alert.get("area"))
        lat, lng = COORDINATES.get(region, COORDINATES["Nationwide"])
        items.append(FeedItem(
            scam_type=str(alert["type"]), title=_text(alert["title"]), summary=_text(alert["description"]),
            region=region, lat=lat, lng=lng, source_name=_text(alert.get("source")),
            source_url=f"https://djaga.local/intelligence/{alert['id']}", date=str(alert["date"]),
        ))
    counts["feed_items"] = upsert_feed(items)
    return counts


def ensure_seeded() -> dict[str, int]:
    required = ("map_points", "scam_types", "city_stats", "insights", "live_stats", "top_accounts", "top_phones", "monthly_trend")
    # Earlier builds seeded only map points. Complete those installations rather
    # than treating a partially populated table as a completed migration.
    return {} if all(get_intelligence(kind) for kind in required) else migrate()


if __name__ == "__main__":
    print(json.dumps(migrate(), indent=2))

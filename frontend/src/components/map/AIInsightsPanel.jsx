import { useEffect, useState } from 'react';
import { BarChart3, ListOrdered, Radar } from 'lucide-react';
import InsightCard from './InsightCard';
import LastUpdatedBadge from './LastUpdatedBadge';
import CityRankingList from './CityRankingList';
import { AI_INSIGHTS, LIVE_STATS } from '../../data/dummyAIInsights';
import { useTranslation } from '../../hooks/useTranslation';

const ACCOUNTS = [['512802774281',47],['17900052144',20],['26700077605',15],['1013041100083926',15],['26444100022578',14],['25810500018077',14],['21220000087743',13],['8881032092097',12],['4946775140',11]];
const PHONES = [['0104269914',21],['0179764986',17],['01123520121',15],['01161051865',9],['0163411403',9],['0142897177',9],['0142472412',9],['01125054956',9],['0142447614',8],['28042221522',8]];

function TopTen({ title, values }) {
  return <section style={{ marginBottom: '22px' }}><h3 style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>{title}</h3><div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}><div style={{ display:'grid',gridTemplateColumns:'32px minmax(0,1fr) 48px',gap:'8px',padding:'10px 12px',fontSize:'10px',fontFamily:"'Space Mono',monospace",color:'var(--text-tertiary)',background:'var(--bg-tertiary)' }}><span>No.</span><span>Reported account / phone</span><span style={{textAlign:'right'}}>Reports</span></div>{values.map(([value,reports], index)=><div key={value} style={{ display:'grid',gridTemplateColumns:'32px minmax(0,1fr) 48px',gap:'8px',padding:'10px 12px',borderTop:'1px solid var(--border)',fontSize:'13px',alignItems:'center' }}><span style={{color:'var(--text-tertiary)'}}>{String(index+1).padStart(2,'0')}</span><code style={{fontFamily:"'Space Mono',monospace",color:'var(--text-primary)',fontSize:'11px',overflowWrap:'anywhere'}}>{value}</code><strong style={{textAlign:'right',color:'var(--threat)'}}>{reports}</strong></div>)}</div></section>;
}

function CountUp({ value }) {
  const text = String(value); const numeric = Number(text.replace(/[^0-9.-]/g, ''));
  const isNumber = Number.isFinite(numeric); const prefix = text.startsWith('+') ? '+' : '';
  const [shown, setShown] = useState(isNumber ? 0 : value);
  useEffect(() => {
    if (!isNumber) { setShown(value); return; }
    let frame; const started = performance.now(); const duration = 900;
    const animate = now => { const progress = Math.min((now - started) / duration, 1); setShown(Math.floor((1 - Math.pow(1-progress, 3)) * numeric)); if (progress < 1) frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate); return () => cancelAnimationFrame(frame);
  }, [numeric, isNumber, value]);
  return <>{isNumber ? `${prefix}${shown.toLocaleString()}` : value}</>;
}

function MonthlyTrend() {
  const points = [{month:'Feb',value:412},{month:'Mar',value:505},{month:'Apr',value:468},{month:'May',value:621},{month:'Jun',value:714},{month:'Jul',value:847}];
  const max = Math.max(...points.map(point => point.value));
  return <section style={{ margin:'4px 0 22px', padding:'14px', border:'1px solid var(--border)', borderRadius:'12px', background:'linear-gradient(135deg, var(--accent-dim), transparent)' }}><style>{`@keyframes djagaBarRise{from{transform:scaleY(.04);opacity:.1}to{transform:scaleY(1);opacity:1}}@keyframes djagaBarPulse{0%,100%{filter:brightness(1);box-shadow:0 0 16px var(--accent-dim)}50%{filter:brightness(1.35);box-shadow:0 0 26px var(--accent)}}`}</style><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'13px'}}><div><h3 style={{margin:0,fontSize:'13px',color:'var(--text-primary)'}}>Scam reports over six months</h3><p style={{margin:'3px 0 0',fontSize:'10px',color:'var(--text-tertiary)'}}>Reported signals across Malaysia</p></div><strong style={{fontSize:'13px',color:'var(--accent)'}}>+106%</strong></div><div style={{height:'116px',display:'flex',alignItems:'end',gap:'8px',borderBottom:'1px solid var(--border)'}}>{points.map((point,index)=><div key={point.month} style={{height:'100%',flex:1,display:'flex',flexDirection:'column',justifyContent:'end',alignItems:'center',gap:'5px'}}><span style={{fontSize:'9px',color:'var(--text-secondary)'}}><CountUp value={point.value}/></span><div title={`${point.month}: ${point.value} reports`} style={{width:'100%',height:`${Math.max(16,point.value/max*82)}px`,borderRadius:'5px 5px 0 0',background:index===points.length-1?'var(--accent)':'rgba(79,209,165,.42)',transformOrigin:'bottom',animation:`djagaBarRise 700ms cubic-bezier(.2,.8,.2,1) ${index*80}ms both${index===points.length-1?', djagaBarPulse 2.2s ease-in-out 850ms infinite':''}`}}/></div>)}</div><div style={{display:'flex',gap:'8px',marginTop:'7px'}}>{points.map(point=><span key={point.month} style={{fontSize:'9px',textAlign:'center',flex:1,color:'var(--text-tertiary)'}}>{point.month}</span>)}</div></section>;
}

export default function AIInsightsPanel({ activeFilter }) {
  const [tab, setTab] = useState(0); const highlightedTags = activeFilter === 'all' ? [] : [activeFilter]; const { t } = useTranslation();
  const tabs = [{label:'Latest Modus Operandi',icon:Radar},{label:'Top 10',icon:ListOrdered},{label:'Statistics',icon:BarChart3}];
  return <div style={{ display:'flex',flexDirection:'column',minHeight:'100%',background:'var(--bg-primary)',borderLeft:'1px solid var(--border)',borderRadius:'0 16px 16px 0',overflow:'hidden' }}>
    <style>{`@keyframes djagaInsightPanelIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}`}</style>
    <div style={{padding:'20px 20px 0'}}><div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}><h2 style={{fontSize:'18px',fontFamily:"'Syne', sans-serif",fontWeight:700,color:'var(--text-primary)',margin:0}}>{t('map.aiInsights')}</h2><span style={{fontSize:'10px',fontWeight:600,padding:'3px 10px',borderRadius:'999px',background:'var(--accent)',color:'#062119'}}>DJAGA AI</span></div><p style={{fontSize:'11px',color:'var(--text-tertiary)',margin:'2px 0 12px'}}>{t('map.poweredBy')}</p><LastUpdatedBadge />
      <div style={{display:'flex',gap:'6px',margin:'16px 0 12px',overflowX:'auto'}}>{tabs.map((item,index)=>{const Icon=item.icon;const active=tab===index;return <button key={item.label} onClick={()=>setTab(index)} style={{display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap',padding:'8px 10px',borderRadius:'9px',border:`1px solid ${active?'var(--accent)':'var(--border)'}`,background:active?'var(--accent-dim)':'transparent',color:active?'var(--accent)':'var(--text-secondary)',fontSize:'10px',fontWeight:700,cursor:'pointer'}}><Icon size={13}/>{item.label}</button>})}</div>
    </div>
    <div key={tab} style={{padding:'0 20px 20px',animation:'djagaInsightPanelIn 320ms cubic-bezier(.2,.8,.2,1) both'}}>
      {tab === 0 && AI_INSIGHTS.map((insight,index)=>{const highlighted=highlightedTags.length>0&&insight.tags.some(tag=>highlightedTags.some(filter=>tag.includes(filter)));return <InsightCard key={insight.id} insight={insight} index={index} isHighlighted={highlighted}/>;})}
      {tab === 1 && <><p style={{fontSize:'11px',lineHeight:1.55,color:'var(--text-tertiary)',margin:'2px 0 16px'}}>Most reported scam identifiers this month. Verify independently and never transfer money under pressure.</p><TopTen title="Bank accounts" values={ACCOUNTS}/><TopTen title="Phone numbers" values={PHONES}/></>}
      {tab === 2 && <><p style={{fontSize:'11px',lineHeight:1.55,color:'var(--text-tertiary)',margin:'2px 0 16px'}}>Live intelligence summary across DJAGA’s monitored Malaysian scam signals.</p><MonthlyTrend />{[['Reports today',LIVE_STATS.totalReportsToday,'var(--accent)'],['Active alerts',LIVE_STATS.activeAlerts,'var(--threat)'],['New today',`+${LIVE_STATS.newSinceYesterday}`,'var(--warning)'],['AI scans today',LIVE_STATS.aiScansToday,'var(--safe)'],['Most affected area',LIVE_STATS.mostAffectedCity,'var(--text-primary)']].map(([label,value,color])=><div key={label} style={{padding:'15px 0',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}><span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{label}</span><strong style={{fontSize:'17px',color}}><CountUp value={value}/></strong></div>)}<CityRankingList activeFilter={activeFilter}/></>}
    </div>
  </div>;
}

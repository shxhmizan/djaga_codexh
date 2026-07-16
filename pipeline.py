"""Async investigation orchestration. LangGraph describes the routing; execution stays observable through events."""
from __future__ import annotations
import asyncio
import time
import uuid
from dataclasses import dataclass,field
from typing import Any
try:
    from langgraph.graph import END, START, StateGraph
except ImportError:  # keeps a helpful dev path before dependencies are installed
    StateGraph = None; START = "__start__"; END = "__end__"
from config import settings
from contracts import AgentResult, TraceEvent, Verdict
from db import create_check, get_check, save_verdict, update_check
from agents import get_agent

@dataclass
class Session:
    id:str; user_id:str; kind:str; events:list[TraceEvent]=field(default_factory=list)
    results:dict[str,AgentResult]=field(default_factory=dict); complete:bool=False; started:bool=False
    text:str|None=None; blob:bytes|None=None; content_type:str|None=None

class PipelineManager:
    def __init__(self):self.sessions:dict[str,Session]={}
    async def create(self,user_id:str,kind:str,demo:bool=False)->str:
        session_id=str(uuid.uuid4()); self.sessions[session_id]=Session(session_id,user_id,kind)
        if not demo:create_check(session_id,user_id,kind)
        return session_id
    async def emit(self,s:Session,type:str,agent:str|None,status:str,message:str,score:float|None=None,evidence:dict|None=None):
        s.events.append(TraceEvent(type=type,agent=agent,ts=time.time(),status=status,message=message,score=score,evidence=evidence))
    async def add_chunk(self,session_id:str,user_id:str,blob:bytes,content_type:str):
        s=self._owned(session_id,user_id);s.blob=blob;s.content_type=content_type
        if not s.started: asyncio.create_task(self.run(s))
    async def analyze(self,session_id:str,user_id:str,text:str|None=None,blob:bytes|None=None,content_type:str|None=None):
        s=self._owned(session_id,user_id);s.text=text;s.blob=blob;s.content_type=content_type
        if not s.started:asyncio.create_task(self.run(s))
    def _owned(self,session_id:str,user_id:str)->Session:
        s=self.sessions.get(session_id)
        if not s:
            check=get_check(session_id,user_id)
            if not check:raise ValueError("Check not found")
            s=Session(session_id,user_id,check['kind']);self.sessions[session_id]=s
        if s.user_id != user_id:raise ValueError("Check not found")
        return s
    async def events_since(self,session_id:str,cursor:int):
        s=self.sessions.get(session_id)
        return ((s.events[cursor:] if s else []), (s.complete if s else True))
    async def invoke_agent(self,s:Session,name:str)->AgentResult:
        await self.emit(s,"trace",name,"started",f"{name.replace('_',' ').title()} is investigating.")
        try:
            await asyncio.sleep({"intake":.5,"forensics":4,"transcribe":6,"behavioral":7,"registry":9,"osint":12,"image_forensics":5}.get(name,.5)*settings.mock_delay_scale)
            result=await get_agent(name).run(kind=s.kind,text=s.text,blob=s.blob,content_type=s.content_type)
            s.results[name]=result
            if name=="transcribe":
                transcript=result.payload.get("transcript","");s.text=transcript
                await self.emit(s,"transcript",name,"evidence",transcript,evidence={"transcript":transcript})
            else:
                await self.emit(s,"trace",name,"evidence",result.payload.get("claim",f"{name} finished."),result.score,result.payload)
                if result.score is not None:
                    await self.emit(s,"risk",name,"evidence",f"{name.title()} signal received.",result.score,{"agent":name})
            return result
        except Exception as exc:
            result=AgentResult(agent=name,unavailable=True,payload={"error":str(exc)})
            s.results[name]=result
            await self.emit(s,"trace",name,"error",f"{name.title()} is unavailable; DJAGA continued without it.")
            return result
    async def run(self,s:Session):
        if s.started:return
        s.started=True
        if s.user_id != "demo":update_check(s.id,"running")
        try:
            await self.invoke_agent(s,"intake")
            names = (["forensics","transcribe","registry","osint"] if s.kind in {"call","voice"} else ["behavioral","registry","osint"] if s.kind=="message" else ["image_forensics","osint"])
            results=await asyncio.gather(*(self.invoke_agent(s,n) for n in names))
            if s.kind in {"call","voice"}:
                # Behavioral must see completed transcription but remains independent of other investigations.
                await self.invoke_agent(s,"behavioral")
            verdict=self.fuse(s)
            s.results['verdict']=AgentResult(agent='verdict',score=verdict.risk,payload=verdict.model_dump())
            await self.emit(s,"trace","verdict","done",self._verdict_message(verdict),verdict.risk,{"verdict":verdict.model_dump()})
            await self.emit(s,"risk","verdict","done",verdict.level.title(),verdict.risk,{"verdict":verdict.model_dump()})
            if s.user_id != "demo":save_verdict(s.id,verdict)
        finally:
            s.complete=True
    def fuse(self,s:Session)->Verdict:
        weights=settings.audio_weights if s.kind in {"call","voice"} else settings.text_weights if s.kind=="message" else settings.image_weights
        available={n:r for n,r in s.results.items() if n in weights and r.score is not None and not r.unavailable}
        total=sum(weights[n] for n in available) or 1
        risk=sum((weights[n]/total)*float(r.score) for n,r in available.items())
        level="danger" if risk>=settings.danger_threshold else "caution" if risk>=settings.caution_threshold else "safe"
        evidence=[]
        for n,r in available.items():evidence.append({"agent":n,"claim":r.payload.get("claim",f"{n} signal"),"weight_contribution":round(weights[n]/total*float(r.score),3),"score":r.score,"mock":r.payload.get("mock",False)})
        transcript=s.results.get("transcribe",AgentResult(agent="x")).payload.get("transcript",s.text)
        flagged=["do not tell anyone","Transfer RM3,000 now","frozen account"] if risk>=.65 else []
        return Verdict(risk=round(risk,3),level=level,kind=s.kind,evidence=evidence,excerpt=transcript,flagged_phrases=flagged)
    def _verdict_message(self,v:Verdict)->str:
        return "This may be a scam. Do not transfer money or share codes." if v.level=="danger" else "Evidence is mixed. Pause and verify independently." if v.level=="caution" else "No strong scam signal was found in this check."

manager=PipelineManager()

def build_graph():
    """A compact LangGraph definition for deployment introspection and future real-agent routing."""
    if StateGraph is None:return None
    graph=StateGraph(dict)
    graph.add_node("intake",lambda s:s);graph.add_node("investigate",lambda s:s);graph.add_node("verdict",lambda s:s)
    graph.add_edge(START,"intake");graph.add_edge("intake","investigate");graph.add_edge("investigate","verdict");graph.add_edge("verdict",END)
    return graph.compile()
graph=build_graph()

"""LangGraph-powered investigation orchestration with observable SSE events."""
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
    def __init__(self):
        self.sessions:dict[str,Session]={}
        self.graphs:dict[str,Any]={}
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
            # Preserve the useful live demonstration cadence in mock mode only.
            # Real providers should start immediately and report their genuine
            # latency through the trace stream.
            if settings.agent_mode_for(name) != "real":
                await asyncio.sleep({"intake":.5,"forensics":4,"transcribe":6,"behavioral":7,"registry":9,"osint":12,"image_forensics":5}.get(name,.5)*settings.mock_delay_scale)
            result=await get_agent(name).run(kind=s.kind,text=s.text,blob=s.blob,content_type=s.content_type)
            s.results[name]=result
            if result.unavailable:
                await self.emit(s,"trace",name,"unavailable",result.payload.get("claim",f"{name.title()} was unavailable; DJAGA continued without it."))
                return result
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
            graph = self.graph_for(s.kind)
            if graph is None:
                await self._run_fallback(s)
            else:
                # This is the production execution path: LangGraph schedules the
                # fan-out and waits at the Verdict join before completing a session.
                await graph.ainvoke({"session": s})
        finally:
            s.complete=True

    async def _finish_verdict(self, s: Session) -> None:
        await self.emit(s, "trace", "verdict", "started", "Verdict is weighting the available investigation evidence.")
        try:
            verdict_result = await get_agent("verdict").run(kind=s.kind, results=s.results, text=s.text)
            verdict = Verdict(**verdict_result.payload["verdict"])
        except Exception as exc:
            # Verdict is deterministic and should not fail, but retain a safe
            # session outcome if its implementation ever becomes unavailable.
            await self.emit(s, "trace", "verdict", "error", "Verdict fusion encountered an error; DJAGA returned a cautious fallback.")
            verdict = self.fuse(s)
            verdict_result = AgentResult(agent="verdict", score=verdict.risk, payload={"verdict": verdict.model_dump(), "error": str(exc)}, unavailable=True)
        s.results['verdict']=verdict_result
        await self.emit(s,"trace","verdict","done",self._verdict_message(verdict),verdict.risk,{"verdict":verdict.model_dump()})
        await self.emit(s,"risk","verdict","done",verdict.level.title(),verdict.risk,{"verdict":verdict.model_dump()})
        if s.user_id != "demo":save_verdict(s.id,verdict)

    async def _run_fallback(self, s: Session) -> None:
        """Only used if LangGraph cannot import in a constrained development environment."""
        await self.invoke_agent(s,"intake")
        names = (["forensics","transcribe","registry","osint"] if s.kind in {"call","voice"} else ["behavioral","registry","osint"] if s.kind=="message" else ["image_forensics","osint"])
        await asyncio.gather(*(self.invoke_agent(s,n) for n in names))
        if s.kind in {"call","voice"}: await self.invoke_agent(s,"behavioral")
        await self._finish_verdict(s)

    def graph_for(self, kind: str):
        if StateGraph is None:
            return None
        kind = "audio" if kind in {"call", "voice"} else kind
        if kind in self.graphs:
            return self.graphs[kind]
        graph = StateGraph(dict)
        async def agent_node(state: dict, name: str):
            await self.invoke_agent(state["session"], name)
            # The Session object is shared in graph input; returning no update
            # preserves it for every parallel branch and the join node.
            return None
        async def intake(state: dict): return await agent_node(state, "intake")
        async def forensics(state: dict): return await agent_node(state, "forensics")
        async def transcribe(state: dict): return await agent_node(state, "transcribe")
        async def behavioral(state: dict): return await agent_node(state, "behavioral")
        async def registry(state: dict): return await agent_node(state, "registry")
        async def osint(state: dict): return await agent_node(state, "osint")
        async def image_forensics(state: dict): return await agent_node(state, "image_forensics")
        async def verdict(state: dict):
            await self._finish_verdict(state["session"])
            return None
        graph.add_node("intake", intake); graph.add_node("behavioral", behavioral)
        graph.add_node("registry", registry); graph.add_node("osint", osint); graph.add_node("verdict", verdict)
        graph.add_edge(START, "intake")
        if kind == "audio":
            graph.add_node("forensics", forensics); graph.add_node("transcribe", transcribe)
            graph.add_edge("intake", "forensics"); graph.add_edge("intake", "transcribe")
            graph.add_edge("intake", "registry"); graph.add_edge("intake", "osint")
            graph.add_edge("transcribe", "behavioral")
            graph.add_edge(["forensics", "behavioral", "registry", "osint"], "verdict")
        elif kind == "message":
            graph.add_edge("intake", "behavioral"); graph.add_edge("intake", "registry"); graph.add_edge("intake", "osint")
            graph.add_edge(["behavioral", "registry", "osint"], "verdict")
        else:
            graph.add_node("image_forensics", image_forensics)
            graph.add_edge("intake", "image_forensics"); graph.add_edge("intake", "osint")
            graph.add_edge(["image_forensics", "osint"], "verdict")
        graph.add_edge("verdict", END)
        compiled = graph.compile()
        self.graphs[kind] = compiled
        return compiled
    def fuse(self,s:Session)->Verdict:
        return get_agent("verdict").compose(kind=s.kind, results=s.results, text=s.text)
    def _verdict_message(self,v:Verdict)->str:
        return "This may be a scam. Do not transfer money or share codes." if v.level=="danger" else "Evidence is mixed. Pause and verify independently." if v.level=="caution" else "No strong scam signal was found in this check."

manager=PipelineManager()

def build_graph():
    """Expose the real audio graph for graph inspection and deployment diagnostics."""
    return manager.graph_for("call")
graph=build_graph()

"""Agent adapters choose a mock or live implementation at runtime."""
from .intake import IntakeAgent
from .forensics import ForensicsAgent
from .image_forensics import ImageForensicsAgent
from .transcribe import TranscribeAgent
from .behavioral import BehavioralAgent
from .registry import RegistryAgent
from .osint import OSINTAgent
from .verdict import VerdictAgent

_agents={"intake":IntakeAgent(),"forensics":ForensicsAgent(),"image_forensics":ImageForensicsAgent(),"transcribe":TranscribeAgent(),"behavioral":BehavioralAgent(),"registry":RegistryAgent(),"osint":OSINTAgent(),"verdict":VerdictAgent()}
def get_agent(name): return _agents[name]

import { useRef, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';

export default function Chat() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello — I’m DJAGA. Ask about a suspicious number, a recent scam, or one of your checks.' }]);
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const inputRef=useRef(null);
  const send = async (event) => {
    event.preventDefault(); const text=input.trim(); if (!text || loading) return;
    setInput(''); setMessages(prev=>[...prev,{role:'user',content:text},{role:'assistant',content:''}]); setLoading(true);
    try {
      const response=await fetch('/api/chat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
      if (!response.ok) throw new Error(); const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const packets=buffer.split('\n\n');buffer=packets.pop()||'';packets.forEach(packet=>{const data=packet.split('\n').find(line=>line.startsWith('data: '));if(!data)return;try{const event=JSON.parse(data.slice(6));if(event.status==='evidence')setMessages(prev=>{const copy=[...prev];copy[copy.length-1]={role:'assistant',content:copy[copy.length-1].content+event.message};return copy});}catch{}})}
    } catch { setMessages(prev=>[...prev.slice(0,-1),{role:'assistant',content:'I could not reach the DJAGA assistant. Please try again.'}]); }
    setLoading(false);
  };
  return <PageWrapper><div className="py-6 max-w-3xl mx-auto"><div className="flex items-center gap-3 mb-6"><div className="p-3 rounded-xl" style={{background:'var(--accent-dim)'}}><Bot style={{color:'var(--accent)'}} /></div><div><h1 className="text-3xl font-bold" style={{fontFamily:'var(--font-display)'}}>DJAGA assistant</h1><p className="text-sm" style={{color:'var(--text-secondary)'}}>Practical scam safety, grounded in your DJAGA data.</p></div></div><Card className="min-h-[420px] flex flex-col"><div className="flex-1 space-y-4 p-1">{messages.map((message,index)=><div key={index} className="flex" style={{justifyContent:message.role==='user'?'flex-end':'flex-start'}}><div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-6" style={{background:message.role==='user'?'var(--accent)':'var(--bg-tertiary)',color:message.role==='user'?'#062119':'var(--text-primary)'}}>{message.content || (loading && 'Thinking…')}</div></div>)}</div><form onSubmit={send} className="flex gap-2 pt-4 border-t" style={{borderColor:'var(--border)'}}><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask DJAGA anything about scams…" className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',color:'var(--text-primary)'}}/><button className="p-3 rounded-xl" style={{background:'var(--accent)',color:'#062119',border:'none'}} aria-label="Send"><Send size={18}/></button></form></Card></div></PageWrapper>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  RadioReceiver,
  Send,
  Sparkles,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am DJAGA. Talk to me or type a question about scams, reports, or saved checks.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micState, setMicState] = useState('idle');
  const [notice, setNotice] = useState('');
  const [waveform, setWaveform] = useState(() => Array.from({ length: 36 }, () => 0.18));
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const conversation = useConversation({
    onConnect: () => setNotice('Voice connected. Speak naturally.'),
    onDisconnect: () => setNotice('Voice session ended.'),
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error);
      setNotice(`The voice session could not continue${error?.message ? `: ${error.message}` : '.'}`);
    },
  });

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';
  const getInputByteFrequencyData = conversation.getInputByteFrequencyData;

  const statusCopy = useMemo(() => {
    if (isConnected && conversation.isSpeaking) return 'Agent speaking';
    if (isConnected && conversation.isListening) return 'Listening';
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting';
    return 'Standby';
  }, [conversation.isListening, conversation.isSpeaking, isConnected, isConnecting]);

  useEffect(() => {
    let frameId;
    let idlePhase = 0;

    const tick = () => {
      if (isConnected && !conversation.isMuted) {
        const data = getInputByteFrequencyData?.();
        if (data?.length) {
          const bucketSize = Math.max(1, Math.floor(data.length / 36));
          setWaveform(Array.from({ length: 36 }, (_, index) => {
            const start = index * bucketSize;
            const slice = data.slice(start, start + bucketSize);
            const average = slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
            return Math.max(0.12, Math.min(1, average / 180));
          }));
        }
      } else {
        idlePhase += 0.075;
        setWaveform((current) => current.map((_, index) => {
          const base = Math.sin(idlePhase + index * 0.52) * 0.12;
          return 0.2 + Math.max(0, base);
        }));
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [conversation.isMuted, getInputByteFrequencyData, isConnected]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('blocked');
      setNotice('This browser does not support microphone capture. Use Chrome, Edge, or Safari over HTTPS or localhost.');
      return false;
    }

    try {
      setMicState('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('granted');
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicState('blocked');
      setNotice('Microphone access is blocked. Enable it in browser site settings, then try again.');
      return false;
    }
  }

  async function startVoiceAgent() {
    const hasMic = micState === 'granted' || await requestMicrophone();
    if (!hasMic) return;

    try {
      setNotice('Creating a secure ElevenLabs voice session...');
      const response = await fetch('/api/elevenlabs/conversation', { credentials: 'include' });
      const config = await response.json();
      if (!response.ok) throw new Error(config.detail || 'Voice agent is not configured.');
      const dynamicVariables = config.dynamic_variables || {};
      if (config.signed_url) await conversation.startSession({ signedUrl: config.signed_url, dynamicVariables });
      else await conversation.startSession({ agentId: config.agent_id, dynamicVariables });
    } catch (error) {
      setNotice(error.message || 'Unable to start the ElevenLabs voice agent.');
    }
  }

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const packets = buffer.split('\n\n');
        buffer = packets.pop() || '';

        packets.forEach((packet) => {
          const data = packet.split('\n').find((line) => line.startsWith('data: '));
          if (!data) return;

          try {
            const eventData = JSON.parse(data.slice(6));
            if (eventData.status === 'evidence') {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: 'assistant',
                  content: copy[copy.length - 1].content + eventData.message,
                };
                return copy;
              });
            }
          } catch {
            // Ignore malformed stream fragments and keep the chat session alive.
          }
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'I could not reach the DJAGA assistant. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageWrapper>
      <div className="assistant-shell py-6 md:py-10">
        <section className="assistant-voice-panel" aria-live="polite">
          <div className="agent-topbar">
            <div className="agent-brand-chip">
              <RadioReceiver size={16} />
              Voice and chat
            </div>
            <div className={`agent-pill ${micState === 'granted' ? 'ok' : micState === 'blocked' ? 'danger' : ''}`}>
              {micState === 'granted' ? <CheckCircle2 size={15} /> : micState === 'blocked' ? <AlertTriangle size={15} /> : <Mic size={15} />}
              {micState === 'granted' ? 'Mic ready' : micState === 'blocked' ? 'Mic blocked' : 'Mic pending'}
            </div>
          </div>

          <div className="assistant-voice-center">
            <div className={`agent-core ${isConnected ? 'is-live' : ''} ${conversation.isSpeaking ? 'is-speaking' : ''}`}>
              <div className="agent-core-ring ring-a" />
              <div className="agent-core-ring ring-b" />
              <div className="agent-core-button">
                {isConnecting ? <Loader2 className="agent-spin" size={38} /> : isConnected ? <Mic size={42} /> : <Sparkles size={42} />}
              </div>
            </div>

            <div className="agent-copy">
              <span>{statusCopy}</span>
              <h1>DJAGA Assistant</h1>
              <p>Speak for quick public intelligence. Type for a database-grounded answer using DJAGA’s current feed and your saved checks.</p>
            </div>
          </div>

          <div className={`agent-realtime-wave ${isConnected ? 'is-active' : ''}`} aria-label="Realtime voice waveform">
            <div className="agent-wave-midline" />
            {waveform.map((level, index) => (
              <span key={index} style={{ '--level': level }} />
            ))}
          </div>

          <div className="agent-control-dock">
            {!isConnected ? (
              <button className="agent-primary agent-main-action" onClick={startVoiceAgent} disabled={isConnecting}>
                {isConnecting ? <Loader2 className="agent-spin" size={20} /> : <Mic size={20} />}
                {isConnecting ? 'Connecting' : 'Start talking'}
                <ChevronRight size={18} />
              </button>
            ) : (
              <button className="agent-danger agent-main-action" onClick={() => conversation.endSession()}>
                <PhoneOff size={20} />
                End session
              </button>
            )}

            <button className="agent-secondary" onClick={requestMicrophone} disabled={micState === 'requesting'}>
              {micState === 'requesting' ? <Loader2 className="agent-spin" size={18} /> : <Mic size={18} />}
              Check mic
            </button>

            {isConnected && (
              <button className="agent-secondary" onClick={() => conversation.setMuted(!conversation.isMuted)}>
                {conversation.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {conversation.isMuted ? 'Unmute' : 'Mute'}
              </button>
            )}
          </div>

          {notice && <p className="agent-notice">{notice}</p>}
        </section>

        <aside className="assistant-chat-panel">
          <div className="assistant-chat-header">
            <div>
              <h2>Ask DJAGA</h2>
            </div>
            <MessageCircle size={22} />
          </div>

          <div className="assistant-suggested-prompts">
            {['Check a phone or bank number', 'What should I do after an OTP request?', 'Any scams in Ipoh lately?'].map(prompt => <button key={prompt} type="button" onClick={() => { setInput(prompt); inputRef.current?.focus(); }} className="shrink-0 rounded-full px-3 py-1.5 text-[11px]" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)',color:'var(--text-secondary)',cursor:'pointer'}}>{prompt}</button>)}
          </div>

          <div ref={messagesRef} className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`assistant-message-row ${message.role === 'user' ? 'from-user' : ''}`}>
                <div className="assistant-message">
                  {message.content || (loading ? 'Thinking...' : '')}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="assistant-chat-form">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a scam question..."
            />
            <button type="submit" aria-label="Send message" disabled={loading}>
              {loading ? <Loader2 className="agent-spin" size={18} /> : <Send size={18} />}
            </button>
          </form>

        </aside>
      </div>

    </PageWrapper>
  );
}

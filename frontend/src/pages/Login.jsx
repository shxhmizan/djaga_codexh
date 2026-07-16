import { useState } from 'react';
import { Shield, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Login() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response=await fetch(register?'/api/auth/register':'/api/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(register?{name,email,password}:{email,password})});
      const data=await response.json(); if (!response.ok) throw new Error(data.detail || 'Could not sign in');
      window.location.assign('/');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--bg-primary)' }}>
    <div className="w-full max-w-md rounded-3xl p-8" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}><Shield style={{ color: 'var(--accent)' }} /></div>
      <p className="text-xs uppercase tracking-[.18em] mb-3" style={{ color: 'var(--accent)' }}>Malaysia scam defence</p>
      <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{register ? 'Create your account' : 'Welcome to DJAGA'}</h1>
      <p className="text-sm leading-6 mb-7" style={{ color: 'var(--text-secondary)' }}>Save your checks, evidence, and scam intelligence securely.</p>
      <form onSubmit={submit} className="space-y-3">
        {register && <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',color:'var(--text-primary)'}} />}
        <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
        <input required minLength="8" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (8+ characters)" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
        {error && <p className="flex gap-2 text-xs" style={{color:'var(--threat)'}}><AlertCircle size={15}/>{error}</p>}
        <button disabled={loading} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold" style={{background:'var(--accent)',color:'#062119',border:'none',cursor:'pointer'}}>{register ? <UserPlus size={19}/> : <LogIn size={19}/>} {loading ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
      </form>
      <button onClick={()=>{setRegister(!register);setError('')}} className="w-full mt-5 text-sm" style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer'}}>{register ? 'Already have an account? Sign in' : 'New to DJAGA? Create an account'}</button>
    </div>
  </div>;
}

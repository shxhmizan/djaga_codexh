"""Cookie sessions and password authentication, including the explicitly simulated ID flow."""
from __future__ import annotations
import hashlib
import secrets
import uuid
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from contracts import User
from db import create_user, delete_session, save_session, session_user, update_password, user_by_email

COOKIE="djaga_session"
def _hash(password:str,salt:str|None=None)->str:
    salt=salt or secrets.token_hex(16)
    digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt.encode(),260_000).hex()
    return f"{salt}${digest}"
def _verify(password:str,stored:str)->bool:
    # One-time compatibility for the project’s pre-Supabase SHA-256 prototype.
    if "$" not in stored:
        return secrets.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored)
    salt,_=stored.split("$",1); return secrets.compare_digest(_hash(password,salt),stored)
def _reply(user:User):
    raw=secrets.token_urlsafe(32);token_hash=hashlib.sha256(raw.encode()).hexdigest()
    save_session(token_hash,user.id,__import__('time').time()+60*60*24*30)
    res=JSONResponse({"user":user.model_dump()});res.set_cookie(COOKIE,raw,httponly=True,samesite="lax",secure=False,max_age=60*60*24*30)
    return res
def register(payload:dict):
    email=str(payload.get("email","")).lower().strip();password=str(payload.get("password","") );name=str(payload.get("name","")).strip()
    if not email or "@" not in email or len(password)<8: raise HTTPException(422,"Use a valid email and a password of at least 8 characters")
    if user_by_email(email):raise HTTPException(409,"An account already exists for this email")
    user=User(id=str(uuid.uuid4()),email=email,name=name or email.split("@")[0].title(),auth_method="password")
    create_user(user,_hash(password));return _reply(user)
def login(payload:dict):
    found=user_by_email(str(payload.get("email","")).lower().strip())
    if not found or not _verify(str(payload.get("password", "")),found[1]):raise HTTPException(401,"Incorrect email or password")
    return _reply(found[0])
def mydigital_login():
    email="verified@mydigital.demo";found=user_by_email(email)
    if found:return _reply(found[0])
    user=User(id=str(uuid.uuid4()),email=email,name="Verified Malaysian",auth_method="mydigitalid_sim")
    create_user(user,_hash(secrets.token_urlsafe(32)));return _reply(user)
def current_user(raw_token:str|None)->User|None:
    if not raw_token:return None
    return session_user(hashlib.sha256(raw_token.encode()).hexdigest())
def logout(raw_token:str|None):
    if raw_token:delete_session(hashlib.sha256(raw_token.encode()).hexdigest())
    response=JSONResponse({"ok":True});response.delete_cookie(COOKIE);return response

def change_password(user: User, payload: dict) -> None:
    current = str(payload.get("current_password", ""))
    new_password = str(payload.get("new_password", ""))
    if len(new_password) < 8:
        raise HTTPException(422, "Use a new password of at least 8 characters")
    found = user_by_email(user.email)
    if not found or not _verify(current, found[1]):
        raise HTTPException(401, "Your current password is incorrect")
    update_password(user.id, _hash(new_password))

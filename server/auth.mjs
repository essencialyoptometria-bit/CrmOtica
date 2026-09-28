import {createHmac,timingSafeEqual} from 'node:crypto';
export function sign(value,secret) { return createHmac('sha256',secret).update(value).digest('base64url'); }
export function makeSession(secret, now=Date.now()) { const value=Buffer.from(JSON.stringify({exp:now+12*3600000})).toString('base64url'); return value+'.'+sign(value,secret); }
export function validSession(token,secret,now=Date.now()) { try { const [v,s,...extra]=(token||'').split('.'); if(extra.length||!v||!s) return false; const wanted=sign(v,secret); return s.length===wanted.length&&timingSafeEqual(Buffer.from(s),Buffer.from(wanted))&&JSON.parse(Buffer.from(v,'base64url')).exp>now; } catch {return false;} }

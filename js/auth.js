function togglePass(){ 
  const i=document.getElementById('pass'); 
  i.type=i.type==='password'?'text':'password'; 
}

async function login(){
  const passInput = document.getElementById('pass').value || '';
  const errDiv = document.getElementById('err'); const btn = document.querySelector('#login button');
  errDiv.style.display='none';
  if(!passInput.trim()){ errDiv.style.display='block'; return; }
  const originalText = btn.innerText; btn.innerText = "Verificando..."; btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "toto@penas.com", password: passInput })
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) { throw new Error('Pass incorrecta'); }
    sessionToken = data.access_token; localStorage.setItem('pena_token', sessionToken); localStorage.setItem('pena_auth', 'ok'); 
    document.getElementById('login').style.display='none'; document.getElementById('mainContainer').style.display='block'; load();
    setTimeout(updateSmokeSourcePosition, 100);
  } catch(e) { console.warn(e); errDiv.textContent = "Código incorrecto"; errDiv.style.display = 'block';
  } finally { btn.innerText = originalText; btn.disabled = false; }
}

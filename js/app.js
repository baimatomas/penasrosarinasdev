if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js'); }

window.onload=async ()=>{ 
  if(localStorage.getItem('pena_auth')==='ok' && localStorage.getItem('pena_token')){ 
    try {
      // Cargamos los datos primero. Si el token no es válido, supaFetch disparará el reload.
      await load();
      
      // Si load() fue exitoso, ocultamos el login y mostramos la app
      document.getElementById('login').style.display='none'; 
      document.getElementById('mainContainer').style.display='block'; 
      
      // Navegar según el hash de la URL si existe
      const hash = window.location.hash.replace('#', '');
      if (hash && [TAB_TRUCO, TAB_GASTOS, TAB_STATS, TAB_RULES].includes(hash)) {
        tabHistory.push(TAB_HOME);
        navigateToTab(hash);
      }
      setTimeout(updateSmokeSourcePosition, 100);
    } catch(e) {
      console.warn("Error inicializando app:", e);
      localStorage.removeItem('pena_auth'); 
      localStorage.removeItem('pena_token'); 
    }
  } else { 
    localStorage.removeItem('pena_auth'); 
    localStorage.removeItem('pena_token'); 
  } 
};

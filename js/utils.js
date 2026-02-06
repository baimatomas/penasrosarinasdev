function supaFetch(path, options={}, isStorage=false){
  const url = isStorage ? `${SUPABASE_URL}/${path}` : `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = Object.assign({}, API_HEADERS, options.headers||{});
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
  else headers['Authorization'] = 'Bearer ' + SUPABASE_KEY;

  return fetch(url, Object.assign({ cache:'no-store' }, options, { headers }))
    .then(res => {
      if(res.status === 401 && sessionToken) {
         localStorage.removeItem('pena_token'); localStorage.removeItem('pena_auth');
         sessionToken = null; location.reload(); 
      }
      return res;
    });
}

function formatDateSafe(dateString) {
  if(!dateString) return '';
  const parts = dateString.split('-'); if(parts.length < 3) return dateString;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return date.toLocaleDateString('es-AR', {weekday:'short', day:'numeric', month:'short'});
}

function parseStorageUrl(url, defaultBucket = 'penas-fotos') {
  if(url.includes('/storage/v1/object/public/')) {
    const parts = url.split('/storage/v1/object/public/');
    const urlParts = parts[1].split('/');
    return { bucket: urlParts[0], path: urlParts.slice(1).join('/') };
  } else if(url.includes('/storage/v1/object/')) {
    const parts = url.split('/storage/v1/object/');
    const urlParts = parts[1].split('/');
    return { bucket: urlParts[0], path: urlParts.slice(1).join('/') };
  }
  return { bucket: defaultBucket, path: url };
}

async function loadImageWithAuth(url, container, imgElement, fallbackContent = null, defaultBucket = 'penas-fotos') {
  try {
    const { bucket, path } = parseStorageUrl(url, defaultBucket);
    const res = await supaFetch(`storage/v1/object/${bucket}/${path}`, {}, true);
    if(!res.ok) throw new Error('Error loading');
    
    const blob = await res.blob();
    const imgUrl = URL.createObjectURL(blob);
    
    if(imgElement) {
      imgElement.src = imgUrl;
    } else if(container) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:cover';
      container.innerHTML = '';
      container.appendChild(img);
      container.style.cursor = 'pointer';
      // Use the global function defined in ui.js
      container.onclick = () => openGallerySingleWithAuth(url, defaultBucket);
    }
  } catch(e) {
    console.warn('No se pudo cargar imagen:', url, e);
    if(fallbackContent && container) {
      container.innerHTML = fallbackContent;
    }
  }
}

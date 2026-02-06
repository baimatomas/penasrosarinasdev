// UI Helpers
const swalConfig = {
  background: '#1c2b38',
  color: '#f0f0f0',
  confirmButtonColor: '#f4b942',
  cancelButtonColor: '#ff6b6b',
  confirmButtonText: 'Aceptar',
  cancelButtonText: 'Cancelar',
  width: '300px',
  padding: '1.5em',
  customClass: {
    popup: 'swal-delicate-popup',
    title: 'swal-delicate-title',
    htmlContainer: 'swal-delicate-content',
    confirmButton: 'swal-delicate-btn',
    cancelButton: 'swal-delicate-btn'
  }
};

function alertMsg(text, icon = 'info') {
  return Swal.fire({
    ...swalConfig,
    text,
    icon,
    confirmButtonText: 'OK'
  });
}

async function confirmMsg(text, title = '¿Estás seguro?') {
  const result = await Swal.fire({
    ...swalConfig,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
  });
  return result.isConfirmed;
}

async function promptMsg(text, placeholder = '', title = 'Entrada') {
  const { value: name } = await Swal.fire({
    ...swalConfig,
    title,
    text,
    input: 'text',
    inputPlaceholder: placeholder,
    showCancelButton: true,
  });
  return name;
}

function setActiveTab(btnId) {
  $$('.segment-btn').forEach(b => b.classList.remove('selected'));
  $(btnId)?.classList.add('selected');
}

function toggleHeroSection(show) {
  const hero = $('#heroSection');
  const glow = document.getElementById('cigaretteGlow');
  
  if(show) {
    // Solo marcamos que está animando si realmente estaba oculto y va a transicionar
    if (hero.classList.contains('hidden')) {
      hero.dataset.isAnimating = 'true';
      hero.classList.remove('hidden');
    } else {
      // Si ya estaba visible, nos aseguramos que no esté bloqueado
      hero.dataset.isAnimating = 'false';
    }
    
    // Ocultamos brasa preventivamente (se mostrará tras updateSmokeSourcePosition)
    if(glow) glow.style.display = 'none';
  }
  else {
    // Forzamos ocultar brasa inmediatamente antes de cualquier animación
    if(glow) glow.style.display = 'none';
    
    if (!hero.classList.contains('hidden')) {
        hero.classList.add('hidden');
    }
    // Actualizamos para asegurar que el estado interno del humo se detenga
    updateSmokeSourcePosition();
  }
}

function toggleNavTabs(show) {
  const nav = $('#navTabs');
  if(show) nav.classList.remove('hidden');
  else nav.classList.add('hidden');
}

function toggleDetail(card){ 
  const d=card.querySelector('.pena-detail'); 
  if(!d) return; 
  const isOpen = d.style.display === 'block'; 
  $$('.pena-detail').forEach(x=>x.style.display='none'); 
  d.style.display = isOpen ? 'none' : 'block'; 
  
  // Sincronizar posición de brasa y humo
  if (typeof updateSmokeSourcePosition === 'function') {
      updateSmokeSourcePosition();
      // Pequeños delays para asegurar que se capture la posición tras el reflujo del DOM y animaciones
      setTimeout(updateSmokeSourcePosition, 50);
      setTimeout(updateSmokeSourcePosition, 400); 
  }
}

/* ===================== LIGHTBOX LOGIC & SWIPE ===================== */
let currentPhotos = []; 
let touchStartX = 0;
let touchEndX = 0;
let isZoomed = false;

function openGallery(photosArray, startIndex) {
  galleryState.images = photosArray;
  galleryState.index = startIndex;
  
  // Push state to handle Back Button
  window.history.pushState({ modalOpen: true }, "", "");
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').classList.add('active');
  
  updateGallery();
  renderThumbs();
}

function openGallerySingleWithAuth(url, defaultBucket = null) {
  $('#modal').style.display = 'flex';
  $('#modal').classList.add('active');
  $('#modalCounter').style.display = 'none';
  $('#modalThumbs').innerHTML = '';
  
  const img = $('#modalImg');
  img.style.opacity = '0';
  
  const { bucket, path } = parseStorageUrl(url, defaultBucket || url);
  
  supaFetch(`storage/v1/object/${bucket}/${path}`, {}, true)
    .then(res => res.blob())
    .then(blob => {
      img.src = URL.createObjectURL(blob);
      img.onload = () => { img.style.opacity = '1'; };
    })
    .catch(e => {
      console.error(e);
      img.style.opacity = '1';
      img.src = '';
      alertMsg('Error cargando imagen', 'error');
    });
}

// Deprecated in favor of the Auth version, but kept if needed for non-auth flows (if any)
function openGallerySingle(url) {
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').classList.add('active');
  document.getElementById('modalImg').src = url;
  document.getElementById('modalCounter').style.display = 'none';
  document.getElementById('modalThumbs').innerHTML = '';
}

function updateGallery() {
  const img = $('#modalImg');
  const counter = $('#modalCounter');
  
  isZoomed = false;
  img.classList.remove('zoomed');
  img.style.opacity = '0';
  
  const url = galleryState.images[galleryState.index];
  loadImageWithAuth(url, null, img, null, 'penas-fotos');
  
  img.onload = () => { img.style.opacity = '1'; };
  
  const current = galleryState.index + 1;
  const total = galleryState.images.length;
  counter.textContent = `${current} / ${total}`;
  
  $$('.modal-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === galleryState.index);
  });
  
  const activeThumb = $('.modal-thumb.active');
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderThumbs() {
  const container = $('#modalThumbs');
  container.innerHTML = '';
  
  galleryState.images.forEach((url, i) => {
    const thumb = document.createElement('img');
    thumb.className = `modal-thumb ${i === galleryState.index ? 'active' : ''}`;
    thumb.onclick = () => goToImage(i);
    container.appendChild(thumb);
    loadImageWithAuth(url, null, thumb, null, 'penas-fotos');
  });
}

function nextImage() {
  galleryState.index = (galleryState.index + 1) % galleryState.images.length;
  updateGallery();
}

function prevImage() {
  galleryState.index = (galleryState.index - 1 + galleryState.images.length) % galleryState.images.length;
  updateGallery();
}

function goToImage(index) {
  galleryState.index = index;
  updateGallery();
}

function toggleZoom() {
  const img = $('#modalImg');
  isZoomed = !isZoomed;
  img.classList.toggle('zoomed', isZoomed);
}

function closeModal() {
  const modal = $('#modal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  $('#modalCounter').style.display = 'block';
  $('#modalThumbs').innerHTML = '';
  if (history.state && history.state.modalOpen) { history.back(); }
}

// Swipe Gesture Logic with improved sensitivity
const modalMain = document.querySelector('.modal-main');
modalMain.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

modalMain.addEventListener('touchend', e => {
    if (isZoomed) return; // Disable swipe when zoomed
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 60;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (document.getElementById('modal').style.display === 'flex') {
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') closeModal();
  }
});

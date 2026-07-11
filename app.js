  // ── Product state
  let ALL_PRODUCTS = [];
  let ACTIVE_FILTER = 'All';

  const TYPE_META = {
    'Manga':       { emoji:'⚔️',  cover:'cover-2', badge:'badge-manga'   },
    'Manhwa':      { emoji:'🌸',  cover:'cover-6', badge:'badge-manhwa'  },
    'eBook':       { emoji:'📖',  cover:'cover-5', badge:'badge-ebook'   },
    'Novel':       { emoji:'🌙',  cover:'cover-4', badge:'badge-novel'   },
    'Short Story': { emoji:'📝',  cover:'cover-7', badge:'badge-ebook'   },
  };

  function productToCard(p){
    const m = TYPE_META[p.contentType] || { emoji:'📄', cover:'cover-1', badge:'badge-ebook' };
    const price = '₦' + Number(p.price).toLocaleString();
    const rating = p.ratingAvg ? Number(p.ratingAvg).toFixed(1) : '—';
    return `
      <div class="product-card" data-id="${p._id}">
        <div class="pcard-cover ${m.cover}">
          ${p.coverImage && p.coverImage.url
            ? `<img src="${p.coverImage.url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`
            : m.emoji}
          <span class="pcard-badge ${m.badge}">${p.contentType}</span>
        </div>
        <div class="pcard-body">
          <div class="pcard-type">${p.contentType}</div>
          <div class="pcard-title">${p.title}</div>
          <div class="pcard-author">by ${p.authorName || 'Unknown'}</div>
          <div class="pcard-footer">
            <span class="pcard-price">${price}</span>
            <span class="pcard-rating">⭐ ${rating}</span>
          </div>
        </div>
      </div>`;
  }

  function renderProducts(id, items){
    const el = document.getElementById(id);
    if(!el) return;
    if(!items || items.length === 0){
      el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);">No products found.</div>';
      return;
    }
    el.innerHTML = items.map(p => productToCard(p)).join('');
    // Wire card clicks to showProduct
    el.querySelectorAll('.product-card').forEach(card => {
      const id = card.dataset.id;
      const product = ALL_PRODUCTS.find(p => p._id === id);
      if(product) card.onclick = () => showProduct(product);
    });
  }

  // ── Currently selected product
  let SELECTED_PRODUCT = null;

  // ── Show product detail page with real data
  function showProduct(product){
    SELECTED_PRODUCT = product;
    const m = TYPE_META[product.contentType] || { emoji:'📄', cover:'cover-1' };

    // Cover
    const coverEl = document.getElementById('pdetail-cover');
    if(coverEl){
      if(product.coverImage && product.coverImage.url){
        coverEl.innerHTML = `<img src="${product.coverImage.url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`;
        coverEl.className = 'product-cover-lg';
      } else {
        coverEl.textContent = m.emoji;
        coverEl.className = `product-cover-lg ${m.cover}`;
      }
    }

    // Text fields
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '—'; };
    const setHTML = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val; };

    set('pdetail-type-badge', product.contentType);
    set('pdetail-title', product.title);
    set('pdetail-author', product.authorName || 'Unknown');
    set('pdetail-rating', `${product.ratingAvg ? product.ratingAvg.toFixed(1) : '—'} (${product.ratingCount || 0} ratings)`);
    set('pdetail-description', product.description);
    set('pdetail-info-type', product.contentType);
    set('pdetail-info-language', product.language || 'English');
    set('pdetail-info-volumes', product.volumes || '—');
    set('pdetail-info-chapters', product.totalChapters || '—');
    set('pdetail-info-pages', product.totalPages || '—');
    set('pdetail-info-updated', product.publishedAt ? new Date(product.publishedAt).toLocaleDateString('en-GB', {month:'short', year:'numeric'}) : '—');

    // Price buttons
    const price = '₦' + Number(product.price).toLocaleString();
    document.querySelectorAll('.pdetail-price').forEach(el => el.textContent = price);
    document.querySelectorAll('.pdetail-buy-btn').forEach(el => {
      el.textContent = `Buy Now — ${price}`;
      el.onclick = () => initiatePaystackPayment(product);
    });

    // Tags
    const tagsEl = document.getElementById('pdetail-tags');
    if(tagsEl && product.tags && product.tags.length){
      tagsEl.innerHTML = product.tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    showPage('reader-product');
    loadProductReviews(product._id);
  }

  async function loadProductReviews(productId){
    const el = document.getElementById('pdetail-reviews-list');
    if(!el) return;
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:14px;">Loading reviews…</div>';
    try {
      const res = await fetch(`${API_BASE}/reviews/${productId}`);
      const data = await res.json();
      const reviews = data.reviews || [];
      if(reviews.length === 0){
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:14px;">No reviews yet — be the first to review this title after purchasing.</div>';
        return;
      }
      el.innerHTML = reviews.map(r => {
        const name = r.buyer?.name || 'Anonymous';
        const initial = name.charAt(0).toUpperCase();
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '';
        return `
        <div style="padding:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--purple);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;">${initial}</div>
            <div><div style="font-weight:600;font-size:14px;color:var(--text);">${name}</div><div style="font-size:11px;color:var(--text3);">Verified Buyer · ${date}</div></div>
            <div style="margin-left:auto;color:#F59E0B;font-size:13px;">${stars}</div>
          </div>
          ${r.comment ? `<p style="font-size:14px;color:var(--text2);line-height:1.65;">${r.comment}</p>` : ''}
        </div>`;
      }).join('');
    } catch(err){
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:14px;">Could not load reviews.</div>';
    }
  }

  async function fetchProducts(){
    try {
      const res = await fetch(`${API_BASE}/products`);
      if(!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      ALL_PRODUCTS = data.products || [];
    } catch(err){
      console.error('Failed to fetch products:', err.message);
      ALL_PRODUCTS = [];
    }
  }

  // ── Active filters state
  const FILTERS = { type: 'All', genre: null, minPrice: null, maxPrice: null, rating: null };

  function applyFilters(){
    let filtered = ALL_PRODUCTS;

    if(FILTERS.type && FILTERS.type !== 'All')
      filtered = filtered.filter(p => p.contentType === FILTERS.type);

    if(FILTERS.genre)
      filtered = filtered.filter(p => p.genre && p.genre.toLowerCase().includes(FILTERS.genre.toLowerCase()));

    if(FILTERS.minPrice !== null)
      filtered = filtered.filter(p => p.price >= FILTERS.minPrice);

    if(FILTERS.maxPrice !== null)
      filtered = filtered.filter(p => p.price <= FILTERS.maxPrice);

    if(FILTERS.rating !== null)
      filtered = filtered.filter(p => p.ratingAvg >= FILTERS.rating);

    renderProducts('store-product-grid', filtered);
    const countEl = document.querySelector('.store-count');
    if (countEl) countEl.textContent = `${filtered.length} title${filtered.length === 1 ? '' : 's'}`;
  }

  function filterProducts(type){
    ACTIVE_FILTER = type;
    FILTERS.type = type;
    // Reset all other filters when switching type
    if(type === 'All'){
      FILTERS.genre = null;
      FILTERS.minPrice = null;
      FILTERS.maxPrice = null;
      FILTERS.rating = null;
      // Clear all sidebar active states and reset to default
      document.querySelectorAll('.sidebar-option').forEach(o => o.classList.remove('active'));
      const firstOptions = document.querySelectorAll('.sidebar-section:first-child .sidebar-option:first-child');
      firstOptions.forEach(o => o.classList.add('active'));
    }
    applyFilters();
  }

  function filterByGenre(genre){
    FILTERS.genre = FILTERS.genre === genre ? null : genre;
    applyFilters();
  }

  function filterByPrice(min, max){
    // Toggle off if same filter clicked again
    if(FILTERS.minPrice === min && FILTERS.maxPrice === max){
      FILTERS.minPrice = null;
      FILTERS.maxPrice = null;
    } else {
      FILTERS.minPrice = min;
      FILTERS.maxPrice = max === null ? Infinity : max;
    }
    applyFilters();
  }

  function filterByRating(rating){
    FILTERS.rating = FILTERS.rating === rating ? null : rating;
    applyFilters();
  }

  const READER_PAGES=['reader-home','reader-store','reader-product','reader-checkout','reader-readview','reader-library','reader-settings'];
  const AUTHOR_PAGES=['author-dashboard'];

  function showPage(name){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const el=document.getElementById('page-'+name);
    if(el)el.classList.add('active');
    window.scrollTo(0,0);
    const rn=document.getElementById('reader-nav');
    const an=document.getElementById('author-nav');
    if(READER_PAGES.includes(name)){
      rn.style.display='flex';an.style.display='none';
      ['home','store','library'].forEach(k=>{
        const lnk=document.getElementById('rnav-'+k);
        if(lnk)lnk.classList.toggle('active',name==='reader-'+k);
      });
    }else if(AUTHOR_PAGES.includes(name)){
      an.style.display='flex';rn.style.display='none';
    }else{
      rn.style.display='none';an.style.display='none';
    }
    if(name==='reader-home'){
      if(ALL_PRODUCTS.length > 0){
        renderProducts('home-product-grid', ALL_PRODUCTS.slice(0,6));
      } else {
        fetchProducts().then(() => renderProducts('home-product-grid', ALL_PRODUCTS.slice(0,6)));
      }
    }
    if(name==='reader-store'){
      if(ALL_PRODUCTS.length > 0){
        filterProducts(ACTIVE_FILTER);
      } else {
        fetchProducts().then(() => filterProducts('All'));
      }
    }
    // reset checkout on each visit, then render the real summary
    if(name==='reader-checkout'){
      document.getElementById('checkout-form').style.display='grid';
      document.getElementById('purchase-success').classList.remove('show');
      renderCheckoutSummary();
    }
    if(name==='reader-library'){
      loadReaderLibrary();
    }
    if(name==='reader-readview'){
      const titleEl = document.getElementById('readview-title');
      const buyBtn = document.getElementById('readview-buy-btn');
      if(SELECTED_PRODUCT){
        if(titleEl) titleEl.textContent = SELECTED_PRODUCT.title;
        if(buyBtn) buyBtn.textContent = `Buy Full Volume — ₦${Number(SELECTED_PRODUCT.price).toLocaleString()}`;
      }
    }
    if(name==='reader-settings'){
      const user = Auth.getUser();
      if(user){
        const nameInput = document.getElementById('reader-settings-name');
        const emailInput = document.getElementById('reader-settings-email');
        if(nameInput) nameInput.value = user.name || '';
        if(emailInput) emailInput.value = user.email || '';
        renderAvatarInto('reader-settings-avatar-preview', user);
      }
    }
  }

  // loginAs() and logout() are now handled by auth.js
  // These stubs are kept so any stale onclick references don't break
  function loginAs(role){ /* replaced by readerLogin / authorLogin in auth.js */ }
  // logout() is defined in auth.js — do not redefine here

  function toggleReaderAuth(){
    const l=document.getElementById('reader-login-box'),r=document.getElementById('reader-register-box');
    l.style.display=l.style.display==='none'?'block':'none';
    r.style.display=r.style.display==='none'?'block':'none';
  }
  function toggleAuthorAuth(){
    const l=document.getElementById('author-login-box'),r=document.getElementById('author-register-box');
    l.style.display=l.style.display==='none'?'block':'none';
    r.style.display=r.style.display==='none'?'block':'none';
  }

  function toggleTheme(){
    const dark=document.body.getAttribute('data-theme')==='dark';
    const next = dark?'light':'dark';
    document.body.setAttribute('data-theme',next);
    try{ localStorage.setItem('yorha_theme', next); }catch(e){}
    document.querySelectorAll('.theme-toggle').forEach(b=>b.textContent=dark?'🌙':'☀️');
  }

  function showAPanel(name){
    document.querySelectorAll('[id^="apanel-"]').forEach(p=>p.style.display='none');
    const el=document.getElementById('apanel-'+name);
    if(el)el.style.display='block';
    document.querySelectorAll('.author-sidebar .sidebar-nav-item').forEach(i=>{
      const oc=i.getAttribute('onclick')||'';
      i.classList.toggle('active',oc.includes("'"+name+"'"));
    });
    document.querySelectorAll('#author-nav .nav-links a').forEach(a=>{
      const oc=a.getAttribute('onclick')||'';
      a.classList.toggle('active',oc.includes("'"+name+"'"));
    });
  }

  // pill clicks
  document.addEventListener('click',e=>{
    if(e.target.classList.contains('cat-pill')){
      e.target.closest('.category-row').querySelectorAll('.cat-pill').forEach(p=>p.classList.remove('active'));
      e.target.classList.add('active');
      const type = e.target.textContent.trim();
      const typeMap = {'All':'All','eBooks':'eBook','Manga':'Manga','Manhwa':'Manhwa','Novels':'Novel','Short Stories':'Short Story'};
      if(typeMap[type] !== undefined) filterProducts(typeMap[type]);
    }
    const sidebarOption = e.target.classList.contains('sidebar-option')
      ? e.target
      : e.target.closest('.sidebar-option');
    if(sidebarOption){
      // Remove active from all in this section, then toggle on clicked
      sidebarOption.closest('.sidebar-section').querySelectorAll('.sidebar-option').forEach(o=>o.classList.remove('active'));
      sidebarOption.classList.add('active');
    }
  });

  // Renders the real order summary on the checkout page from SELECTED_PRODUCT,
  // and wires the pay button to the real Paystack flow. Replaces the old
  // fake card-entry form — Paystack doesn't accept raw card numbers posted
  // to your own server (that's a PCI compliance nightmare), so there was
  // never a legitimate way to make that form "real". The actual payment
  // happens on Paystack's own hosted page after this redirect.
  function renderCheckoutSummary(){
    const el = document.getElementById('checkout-order-summary');
    const btn = document.getElementById('checkout-pay-btn');
    if(!el) return;

    if(!SELECTED_PRODUCT){
      el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text3);">No product selected. <a onclick="showPage(\'reader-store\')" style="color:var(--purple);cursor:pointer;">Browse the store →</a></div>';
      if(btn) btn.disabled = true;
      return;
    }

    const p = SELECTED_PRODUCT;
    const m = TYPE_META[p.contentType] || { emoji:'📄', cover:'cover-1' };
    const base = Number(p.price);
    const vat = Math.round(base * 0.075 * 100) / 100;
    const total = base + vat;
    const coverHtml = p.coverImage && p.coverImage.url
      ? `<img src="${p.coverImage.url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`
      : m.emoji;

    el.innerHTML = `
      <div class="order-item">
        <div class="order-item-cover ${m.cover}">${coverHtml}</div>
        <div style="flex:1;">
          <div class="order-item-title">${p.title}</div>
          <div class="order-item-meta">${p.contentType} · by ${p.authorName || 'Unknown'}</div>
          <div style="margin-top:7px;"><span class="status-badge status-live" style="font-size:10px;">Instant Access</span></div>
        </div>
        <div class="order-item-price">₦${base.toLocaleString()}</div>
      </div>
      <div class="order-breakdown">
        <div class="order-row"><span>Subtotal</span><span>₦${base.toLocaleString()}</span></div>
        <div class="order-row"><span>VAT (7.5%)</span><span>₦${vat.toLocaleString()}</span></div>
        <div class="order-row total"><span>Total</span><span>₦${total.toLocaleString()}</span></div>
      </div>`;

    if(btn){
      btn.disabled = false;
      btn.textContent = `Proceed to Payment — ₦${total.toLocaleString()}`;
      btn.onclick = () => initiatePaystackPayment(p);
    }
  }

  function handleFileSelect(input){
    const file=input.files[0];
    if(file)showFilePreview(file);
  }
  function showFilePreview(file){
    document.getElementById('upload-zone').style.display='none';
    const fp=document.getElementById('file-preview');
    fp.style.display='flex';
    document.getElementById('fp-name').textContent=file.name;
    document.getElementById('fp-size').textContent=(file.size/1024/1024).toFixed(2)+' MB';
  }
  function clearFile(){
    document.getElementById('upload-zone').style.display='block';
    document.getElementById('file-preview').style.display='none';
    document.getElementById('file-input').value='';
  }
  function handleDragOver(e){e.preventDefault();document.getElementById('upload-zone').classList.add('drag-over');}
  function handleDragLeave(){document.getElementById('upload-zone').classList.remove('drag-over');}
  function handleDrop(e){
    e.preventDefault();
    document.getElementById('upload-zone').classList.remove('drag-over');
    const file=e.dataTransfer.files[0];
    if(file)showFilePreview(file);
  }
  function toggleSchedule(sel){
    document.getElementById('schedule-date-wrap').style.display=sel.value==='Schedule for later'?'block':'none';
  }

  async function submitUpload(){
    const title = document.getElementById('upload-title').value.trim();
    const contentType = document.getElementById('upload-type').value;
    const genre = document.getElementById('upload-genre').value;
    const price = document.getElementById('upload-price').value;
    const description = document.getElementById('upload-description').value.trim();
    const tags = document.getElementById('upload-tags').value.trim();
    const publishStatus = document.getElementById('publish-status').value;
    const scheduleDatetime = document.getElementById('upload-schedule-datetime').value;
    const fileInput = document.getElementById('file-input');
    const coverInput = document.getElementById('cover-input');

    if(!title){ alert('Please enter a title.'); return; }
    if(!description){ alert('Please enter a description.'); return; }
    if(!price || Number(price) <= 0){ alert('Please enter a valid price.'); return; }
    if(!fileInput.files[0]){ alert('Please upload a content file (PDF or ZIP) — a listing needs a real file before it can go live.'); return; }
    if(publishStatus === 'Schedule for later' && !scheduleDatetime){ alert('Please pick a date and time to schedule this for.'); return; }

    const btn = document.querySelector('#apanel-upload .btn-primary');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Publishing…';

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('contentType', contentType);
      formData.append('genre', genre);
      formData.append('tags', tags);
      formData.append('price', price);
      formData.append('publishStatus', publishStatus);
      if(publishStatus === 'Schedule for later' && scheduleDatetime){
        formData.append('publishedAt', new Date(scheduleDatetime).toISOString());
      }
      formData.append('file', fileInput.files[0]);

      // NOTE: deliberately NOT using apiFetch here — it always sets
      // Content-Type: application/json, which breaks multipart/form-data's
      // required boundary header. The browser sets that boundary itself
      // only if we don't set Content-Type manually.
      const token = Auth.getToken();
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if(!res.ok){
        throw new Error(data.error || (Array.isArray(data.errors) && data.errors[0]?.msg) || 'Upload failed.');
      }

      // Cover image is a separate endpoint — only call it if one was picked
      if(coverInput.files[0]){
        const coverForm = new FormData();
        coverForm.append('cover', coverInput.files[0]);
        await fetch(`${API_BASE}/products/${data.product._id}/cover`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: coverForm
        });
      }

      const statusLabel = publishStatus === 'Publish immediately' ? 'published'
        : publishStatus === 'Schedule for later' ? 'scheduled'
        : 'saved as a draft';
      alert(`✅ "${title}" ${statusLabel} successfully!`);

      // Reset the form
      document.getElementById('upload-title').value = '';
      document.getElementById('upload-price').value = '';
      document.getElementById('upload-description').value = '';
      document.getElementById('upload-tags').value = '';
      clearFile();

      // Refresh real dashboard data so the new title actually shows up
      await loadAuthorDashboard();
      showAPanel('works');

    } catch(err){
      alert(err.message || 'Upload failed. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // ── Mobile drawer
  function toggleMobileMenu(role) {
    const drawer = document.getElementById('mobile-drawer');
    const panel  = document.getElementById('mobile-drawer-panel');
    if(!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if(isOpen){ drawer.classList.remove('open'); return; }

    const currentPageEl = document.querySelector('.page.active');
    const currentPageId = currentPageEl ? currentPageEl.id : '';
    let currentPanel = '';
    if (role === 'author') {
      const openPanel = document.querySelector('[id^="apanel-"]:not([style*="display: none"]):not([style*="display:none"])');
      if (openPanel) currentPanel = openPanel.id.replace('apanel-', '');
    }
    const isActive = (id) => id === currentPageId ? ' active' : '';
    const isActivePanel = (name) => name === currentPanel ? ' active' : '';

    const readerLinks = `
      <a class="${isActive('page-reader-home').trim()}" onclick="showPage('reader-home');toggleMobileMenu()">🏠 Home</a>
      <a class="${isActive('page-reader-store').trim()}" onclick="showPage('reader-store');toggleMobileMenu()">🛒 Store</a>
      <a class="${isActive('page-reader-library').trim()}" onclick="showPage('reader-library');toggleMobileMenu()">📚 My Library</a>
      <a class="${isActive('page-reader-settings').trim()}" onclick="showPage('reader-settings');toggleMobileMenu()">⚙️ Settings</a>
      <hr style="border-color:var(--border);margin:8px 0;">
      <button onclick="logout();toggleMobileMenu()">Sign Out</button>`;

    const authorLinks = `
      <a class="${isActivePanel('overview').trim()}" onclick="showAPanel('overview');toggleMobileMenu()">📊 Dashboard</a>
      <a class="${isActivePanel('upload').trim()}" onclick="showAPanel('upload');toggleMobileMenu()">📤 Upload</a>
      <a class="${isActivePanel('works').trim()}" onclick="showAPanel('works');toggleMobileMenu()">📚 My Works</a>
      <a class="${isActivePanel('earnings').trim()}" onclick="showAPanel('earnings');toggleMobileMenu()">💰 Earnings</a>
      <a class="${isActivePanel('settings').trim()}" onclick="showAPanel('settings');toggleMobileMenu()">⚙️ Settings</a>
      <hr style="border-color:var(--border);margin:8px 0;">
      <button onclick="logout();toggleMobileMenu()">Sign Out</button>`;

    panel.innerHTML = role === 'author' ? authorLinks : readerLinks;
    drawer.classList.add('open');
  }

  window.addEventListener('DOMContentLoaded',()=>{
    const pd=document.getElementById('pub-date');
    if(pd)pd.value=new Date().toISOString().split('T')[0];

    const isDark = document.body.getAttribute('data-theme')==='dark';
    document.querySelectorAll('.theme-toggle').forEach(b=>b.textContent = isDark ? '☀️' : '🌙');
  });

/* ═══════════════════════════════════════════════
   SHARED FORMATTING HELPERS
═══════════════════════════════════════════════ */

function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = val; }

function formatDate(d){
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
}

function formatDateTime(d){
  if(!d) return '—';
  return new Date(d).toLocaleString('en-GB', {day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit'});
}

/* ═══════════════════════════════════════════════
   READER LIBRARY — real purchase data
═══════════════════════════════════════════════ */

async function loadReaderLibrary(){
  const gridEl = document.getElementById('library-grid');
  const historyBody = document.getElementById('library-history-tbody');

  try {
    const data = await apiFetch('/orders/my');
    const orders = data.orders || [];

    if(gridEl){
      gridEl.innerHTML = orders.length === 0
        ? `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text3);">You haven't purchased anything yet. <a onclick="showPage('reader-store')" style="color:var(--purple);cursor:pointer;">Browse the store →</a></div>`
        : orders.map(o => {
            const p = o.product || {};
            const m = TYPE_META[p.contentType] || { emoji:'📄', cover:'cover-1' };
            const coverHtml = p.coverImage && p.coverImage.url
              ? `<img src="${p.coverImage.url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`
              : `<span style="font-size:46px;">${m.emoji}</span>`;
            return `
            <div class="lib-card" onclick="downloadLibraryItem('${p._id}')">
              <div class="lib-cover ${m.cover}">${coverHtml}</div>
              <div class="lib-body"><div class="lib-title">${p.title || 'Untitled'}</div><div class="lib-meta">${p.contentType || ''} · ${p.authorName || 'Unknown'}</div><span class="lib-continue">Download / Read →</span></div>
            </div>`;
          }).join('');
    }

    if(historyBody){
      historyBody.innerHTML = orders.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3);">No purchases yet.</td></tr>'
        : orders.map(o => {
            const p = o.product || {};
            return `<tr>
              <td data-label=""><div class="wt-title">${p.title || 'Untitled'}</div><div class="wt-sub">by ${p.authorName || 'Unknown'}</div></td>
              <td data-label="Type">${p.contentType || ''}</td>
              <td data-label="Date"><span class="date-badge">📅 ${formatDate(o.paidAt)}</span></td>
              <td data-label="Amount" style="color:var(--text);font-weight:600;">₦${Number(o.amount).toLocaleString()}</td>
              <td data-label=""><button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="downloadLibraryItem('${p._id}')">Download</button></td>
            </tr>`;
          }).join('');
    }
  } catch(err){
    console.error('Failed to load library:', err.message);
    if(gridEl) gridEl.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text3);">Could not load your library.</div>';
    if(historyBody) historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3);">Could not load purchase history.</td></tr>';
  }
}

async function downloadLibraryItem(productId){
  try {
    const data = await apiFetch(`/files/${productId}`);
    window.open(data.url, '_blank');
  } catch(err){
    alert(err.message || 'Could not access this file.');
  }
}

/* ═══════════════════════════════════════════════
   AUTHOR DASHBOARD — real data end to end
═══════════════════════════════════════════════ */

let AUTHOR_WORKS = [];
let AUTHOR_SALES = [];
let AUTHOR_PAYOUTS = [];
let AUTHOR_BALANCE = { balance: 0, totalEarned: 0 };
let AUTHOR_BANKS = [];

async function loadAuthorDashboard(){
  const user = Auth.getUser();
  if(!user) return;

  renderAuthorProfile(user);

  try {
    const [worksRes, balanceRes, salesRes, payoutsRes] = await Promise.all([
      apiFetch('/products/author/me'),
      apiFetch('/payouts/balance'),
      apiFetch('/orders/sales'),
      apiFetch('/payouts/history'),
    ]);
    AUTHOR_WORKS = worksRes.products || [];
    AUTHOR_BALANCE = balanceRes || { balance: 0, totalEarned: 0 };
    AUTHOR_SALES = salesRes.orders || [];
    AUTHOR_PAYOUTS = payoutsRes.payouts || [];
  } catch(err){
    console.error('Failed to load author dashboard:', err.message);
    AUTHOR_WORKS = []; AUTHOR_SALES = []; AUTHOR_PAYOUTS = [];
  }

  renderAuthorOverview();
  renderAuthorWorks();
  renderAuthorEarnings();
  renderAuthorPayout();
  loadBanksList();
}

// Renders a user's avatar into any element sized/styled like .author-avatar
// — shows the real Cloudinary image if one exists, falls back to the
// initial-letter circle otherwise (same look used before avatars existed).
function renderAvatarInto(elId, user){
  const el = document.getElementById(elId);
  if(!el) return;
  const displayName = (user && (user.penName || user.name)) || '';
  const initial = (displayName || '?').charAt(0).toUpperCase();

  if(user && user.avatar && user.avatar.url){
    el.innerHTML = `<img src="${user.avatar.url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>`;
  } else {
    el.textContent = initial;
  }
}

// Uploads a new avatar for the logged-in user (author or reader — same
// endpoint, role-agnostic) and updates every avatar element on the page
// plus the cached session user, so it reflects immediately without a
// full reload.
async function uploadAvatar(inputEl, previewElId){
  const file = inputEl.files[0];
  if(!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const token = Auth.getToken();
    const res = await fetch(`${API_BASE}/auth/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Avatar upload failed.');

    const user = Auth.getUser();
    user.avatar = data.avatar;
    Auth.setSession(token, user);

    renderAvatarInto('author-avatar', user);
    renderAvatarInto('settings-avatar-preview', user);
    renderAvatarInto('reader-settings-avatar-preview', user);
  } catch(err){
    alert(`❌ ${err.message}`);
  } finally {
    inputEl.value = '';
  }
}

function renderAuthorProfile(user){
  const displayName = user.penName || user.name || '';

  renderAvatarInto('author-avatar', user);
  renderAvatarInto('settings-avatar-preview', user);
  setText('author-name-display', displayName);
  setText('author-handle-display', user.handle ? '@' + user.handle : '');
  setText('author-greeting-name', displayName.split(' ')[0] || 'there');

  const nameInput   = document.getElementById('settings-name');
  const handleInput = document.getElementById('settings-handle');
  const emailInput  = document.getElementById('settings-email');
  const bioInput    = document.getElementById('settings-bio');
  if(nameInput)   nameInput.value = displayName;
  if(handleInput) handleInput.value = user.handle || '';
  if(emailInput)  emailInput.value = user.email || '';
  if(bioInput)    bioInput.value = user.bio || '';
}

function renderAuthorOverview(){
  const totalEarnings = AUTHOR_BALANCE.totalEarned || 0;
  const totalSales = AUTHOR_WORKS.reduce((sum, p) => sum + (p.salesCount || 0), 0);
  const publishedCount = AUTHOR_WORKS.filter(p => p.status === 'live').length;
  const draftCount = AUTHOR_WORKS.filter(p => p.status === 'draft').length;
  const uniqueReaders = new Set(AUTHOR_SALES.map(o => (o.buyer && o.buyer._id) || o.buyer)).size;

  setText('astat-earnings', '₦' + Number(totalEarnings).toLocaleString());
  setText('astat-sales', totalSales);
  setText('astat-published', publishedCount);
  setText('astat-published-sub', `${draftCount} draft${draftCount === 1 ? '' : 's'} pending`);
  setText('astat-readers', uniqueReaders);

  const recentEl = document.getElementById('author-recent-sales');
  if(recentEl){
    const recent = AUTHOR_SALES.slice(0, 4);
    recentEl.innerHTML = recent.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--text3);font-size:14px;">No sales yet.</div>'
      : recent.map(o => `
        <div class="earn-row">
          <div><div class="earn-title">${(o.product && o.product.title) || 'Untitled'}</div><div class="earn-date">📅 ${formatDateTime(o.paidAt)}</div></div>
          <div class="earn-amount">+₦${Number(o.authorEarns || 0).toLocaleString()}</div>
        </div>`).join('');
  }
}

function renderAuthorWorks(){
  const tbody = document.getElementById('works-tbody');
  if(!tbody) return;

  if(AUTHOR_WORKS.length === 0){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3);">No works uploaded yet. <a onclick="showAPanel(\'upload\')" style="color:var(--purple);cursor:pointer;">Upload your first title →</a></td></tr>';
    return;
  }

  const statusClassMap = { live:'status-live', draft:'status-draft', review:'status-review', scheduled:'status-review', suspended:'status-draft' };

  tbody.innerHTML = AUTHOR_WORKS.map(p => {
    const m = TYPE_META[p.contentType] || { emoji:'📄', cover:'cover-1' };
    const statusClass = statusClassMap[p.status] || 'status-draft';
    const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
    const coverHtml = p.coverImage && p.coverImage.url
      ? `<img src="${p.coverImage.url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`
      : m.emoji;
    return `<tr>
      <td data-label="" class="wt-cover-cell"><div class="wt-cover ${m.cover}">${coverHtml}</div></td>
      <td data-label="" class="wt-title-cell"><div class="wt-title">${p.title}</div><div class="wt-sub">${p.genre || ''}</div></td>
      <td data-label="Type">${p.contentType}</td>
      <td data-label="Price">₦${Number(p.price).toLocaleString()}</td>
      <td data-label="Uploaded"><span class="date-badge">📅 ${formatDate(p.createdAt)}</span></td>
      <td data-label="Sales"><strong>${p.salesCount || 0}</strong></td>
      <td data-label="Status"><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td data-label=""><button class="btn btn-ghost" style="font-size:12px;padding:6px 10px;" onclick="openEditProductModal('${p._id}')">Edit</button></td>
    </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   EDIT PRODUCT MODAL
═══════════════════════════════════════════════ */

let EDIT_PRODUCT_ID = null;

function openEditProductModal(productId){
  const product = AUTHOR_WORKS.find(p => p._id === productId);
  if(!product) return;
  EDIT_PRODUCT_ID = productId;

  document.getElementById('edit-title').value = product.title || '';
  document.getElementById('edit-type-display').value = product.contentType || '';
  document.getElementById('edit-genre').value = product.genre || 'Action';
  document.getElementById('edit-price').value = product.price || '';
  document.getElementById('edit-description').value = product.description || '';
  document.getElementById('edit-tags').value = (product.tags || []).join(', ');
  document.getElementById('edit-language').value = product.language || 'English';
  document.getElementById('edit-status').value = product.status || 'draft';
  document.getElementById('edit-chapters').value = product.totalChapters || '';
  document.getElementById('edit-pages').value = product.totalPages || '';
  document.getElementById('edit-volumes').value = product.volumes || '';
  document.getElementById('edit-preview-chapters').value = product.previewChapters || '';
  document.getElementById('edit-cover-input').value = '';
  document.getElementById('edit-product-error').style.display = 'none';

  const modal = document.getElementById('edit-product-modal');
  modal.style.display = 'flex';
}

function hideEditProductModal(){
  document.getElementById('edit-product-modal').style.display = 'none';
  EDIT_PRODUCT_ID = null;
}

async function submitProductEdit(){
  if(!EDIT_PRODUCT_ID) return;
  const btn = document.getElementById('edit-product-save-btn');
  const errEl = document.getElementById('edit-product-error');
  errEl.style.display = 'none';

  const title = document.getElementById('edit-title').value.trim();
  const price = document.getElementById('edit-price').value;
  const description = document.getElementById('edit-description').value.trim();

  if(!title){ errEl.textContent = 'Title is required.'; errEl.style.display = 'block'; return; }
  if(!description){ errEl.textContent = 'Description is required.'; errEl.style.display = 'block'; return; }
  if(!price || Number(price) <= 0){ errEl.textContent = 'Please enter a valid price.'; errEl.style.display = 'block'; return; }

  const tags = document.getElementById('edit-tags').value.trim();
  const payload = {
    title,
    description,
    price: Number(price),
    genre: document.getElementById('edit-genre').value,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    language: document.getElementById('edit-language').value.trim() || 'English',
    status: document.getElementById('edit-status').value,
    totalChapters: document.getElementById('edit-chapters').value ? Number(document.getElementById('edit-chapters').value) : undefined,
    totalPages: document.getElementById('edit-pages').value ? Number(document.getElementById('edit-pages').value) : undefined,
    volumes: document.getElementById('edit-volumes').value ? Number(document.getElementById('edit-volumes').value) : undefined,
    previewChapters: document.getElementById('edit-preview-chapters').value ? Number(document.getElementById('edit-preview-chapters').value) : undefined,
  };

  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiFetch(`/products/${EDIT_PRODUCT_ID}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    // Cover is a separate endpoint (multipart), same as the upload flow —
    // only call it if the author actually picked a new file.
    const coverInput = document.getElementById('edit-cover-input');
    if(coverInput.files[0]){
      const coverForm = new FormData();
      coverForm.append('cover', coverInput.files[0]);
      const token = Auth.getToken();
      const coverRes = await fetch(`${API_BASE}/products/${EDIT_PRODUCT_ID}/cover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: coverForm
      });
      if(!coverRes.ok){
        const coverData = await coverRes.json().catch(() => ({}));
        throw new Error(coverData.error || 'Product details saved, but cover upload failed.');
      }
    }

    hideEditProductModal();
    await loadAuthorDashboard();
    alert('✅ Changes saved.');
  } catch(err){
    errEl.textContent = err.message || 'Could not save changes.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

function renderAuthorEarnings(){
  const now = new Date();
  const thisMonthEarnings = AUTHOR_SALES
    .filter(o => o.paidAt && new Date(o.paidAt).getMonth() === now.getMonth() && new Date(o.paidAt).getFullYear() === now.getFullYear())
    .reduce((sum, o) => sum + (o.authorEarns || 0), 0);

  setText('aearn-month', '₦' + Number(thisMonthEarnings).toLocaleString());
  setText('aearn-alltime', '₦' + Number(AUTHOR_BALANCE.totalEarned || 0).toLocaleString());
  setText('aearn-pending', '₦' + Number(AUTHOR_BALANCE.balance || 0).toLocaleString());

  // Group sales by product for the "Earnings by Title" table
  const byTitle = {};
  AUTHOR_SALES.forEach(o => {
    const key = (o.product && o.product._id) || o.product;
    if(!key) return;
    if(!byTitle[key]) byTitle[key] = { title: (o.product && o.product.title) || 'Untitled', sales: 0, gross: 0, fee: 0, earnings: 0 };
    byTitle[key].sales += 1;
    byTitle[key].gross += (o.amountBase || 0);
    byTitle[key].fee += (o.platformFee || 0);
    byTitle[key].earnings += (o.authorEarns || 0);
  });
  const rows = Object.values(byTitle);
  const byTitleEl = document.getElementById('earnings-by-title-tbody');
  if(byTitleEl){
    byTitleEl.innerHTML = rows.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3);">No sales yet.</td></tr>'
      : rows.map(r => `<tr>
          <td data-label=""><div class="wt-title">${r.title}</div></td>
          <td data-label="Sales">${r.sales}</td>
          <td data-label="Gross">₦${Number(r.gross).toLocaleString()}</td>
          <td data-label="Platform Fee">₦${Number(r.fee).toLocaleString()}</td>
          <td data-label="Your Earnings" style="color:var(--green);font-weight:700;">₦${Number(r.earnings).toLocaleString()}</td>
        </tr>`).join('');
  }

  // Merge sales (+) and payouts (−) into one sorted transaction feed
  const txns = [
    ...AUTHOR_SALES.map(o => ({ date: o.paidAt, title: ((o.product && o.product.title) || 'Sale') + ' — Sale', sub: (o.buyer && o.buyer.name) || '', amount: o.authorEarns || 0 })),
    ...AUTHOR_PAYOUTS.map(p => ({ date: p.processedAt || p.createdAt, title: 'Payout — ' + (p.bankName || ''), sub: p.accountNumber ? ('•••• ' + p.accountNumber.slice(-4)) : '', amount: -(p.amount || 0) })),
  ].filter(t => t.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const txnEl = document.getElementById('author-transaction-history');
  if(txnEl){
    txnEl.innerHTML = txns.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--text3);font-size:14px;">No transactions yet.</div>'
      : txns.map(t => `
        <div class="earn-row">
          <div><div class="earn-title">${t.title}</div><div class="earn-date">📅 ${formatDate(t.date)}${t.sub ? (' · ' + t.sub) : ''}</div></div>
          <div class="${t.amount >= 0 ? 'earn-amount' : ''}" style="${t.amount < 0 ? 'font-size:15px;font-weight:700;color:#EF4444;' : ''}">${t.amount < 0 ? '−' : '+'}₦${Math.abs(t.amount).toLocaleString()}</div>
        </div>`).join('');
  }
}

function renderAuthorPayout(){
  setText('payout-balance-amount', '₦' + Number(AUTHOR_BALANCE.balance || 0).toLocaleString());

  const minHintEl = document.getElementById('payout-min-hint');
  if(minHintEl){
    const min = AUTHOR_BALANCE.minPayoutAmount || 0;
    minHintEl.textContent = min ? `Minimum payout: ₦${Number(min).toLocaleString()}` : '';
  }

  const historyEl = document.getElementById('author-payout-history');
  if(historyEl){
    historyEl.innerHTML = AUTHOR_PAYOUTS.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--text3);font-size:14px;">No payouts yet.</div>'
      : AUTHOR_PAYOUTS.map(p => `
        <div class="earn-row">
          <div><div class="earn-title">Payout — ${p.bankName || ''} •••• ${(p.accountNumber || '').slice(-4)}</div><div class="earn-date">📅 ${formatDate(p.processedAt || p.createdAt)} · ${p.status}</div></div>
          <div style="font-size:15px;font-weight:700;color:#EF4444;">−₦${Number(p.amount).toLocaleString()}</div>
        </div>`).join('');
  }
}

async function loadBanksList(){
  try {
    const data = await apiFetch('/payouts/banks');
    AUTHOR_BANKS = data.banks || [];
    const select = document.getElementById('payout-bank-select');
    if(select && AUTHOR_BANKS.length){
      select.innerHTML = AUTHOR_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
    }
  } catch(err){
    console.error('Failed to load banks:', err.message);
    const select = document.getElementById('payout-bank-select');
    if(select) select.innerHTML = '<option value="">Could not load banks</option>';
  }
}

async function resolvePayoutAccount(){
  const accNumInput = document.getElementById('payout-account-number');
  const bankSelect  = document.getElementById('payout-bank-select');
  const nameInput   = document.getElementById('payout-account-name');
  if(!accNumInput || !bankSelect || !nameInput) return;
  if(accNumInput.value.length !== 10 || !bankSelect.value) return;

  nameInput.value = 'Verifying…';
  try {
    const data = await apiFetch('/payouts/resolve', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: accNumInput.value, bankCode: bankSelect.value })
    });
    nameInput.value = data.accountName;
  } catch(err){
    nameInput.value = '';
    alert(err.message || 'Could not verify this account. Double-check the account number and bank.');
  }
}

async function submitPayoutRequest(){
  const amountInput = document.getElementById('payout-amount');
  const bankSelect = document.getElementById('payout-bank-select');
  const accNumInput = document.getElementById('payout-account-number');
  const nameInput = document.getElementById('payout-account-name');
  const btn = document.getElementById('payout-submit-btn');

  const amount = amountInput.value;
  const bankCode = bankSelect.value;
  const bankName = bankSelect.options[bankSelect.selectedIndex] ? bankSelect.options[bankSelect.selectedIndex].textContent : '';
  const accountNumber = accNumInput.value;
  const accountName = nameInput.value;

  if(!amount || Number(amount) <= 0){ alert('Please enter a valid amount.'); return; }
  const minPayout = AUTHOR_BALANCE.minPayoutAmount || 0;
  if(minPayout && Number(amount) < minPayout){
    alert(`Minimum payout amount is ₦${Number(minPayout).toLocaleString()}.`);
    return;
  }
  if(!accountNumber || accountNumber.length !== 10){ alert('Please enter a valid 10-digit account number.'); return; }
  if(!accountName || accountName === 'Verifying…'){ alert('Please wait for account verification, or check the account number and bank.'); return; }

  btn.disabled = true;
  btn.textContent = 'Processing…';
  try {
    await apiFetch('/payouts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), accountNumber, accountName, bankCode, bankName })
    });
    alert('✅ Payout requested successfully.');
    amountInput.value = '';
    accNumInput.value = '';
    nameInput.value = '';
    await loadAuthorDashboard();
    showAPanel('payout');
  } catch(err){
    alert(err.message || 'Payout request failed.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Request Payout';
  }
}

async function saveAuthorProfile(){
  const name = document.getElementById('settings-name').value.trim();
  const handle = document.getElementById('settings-handle').value.trim();
  const bio = document.getElementById('settings-bio').value.trim();
  const btn = document.getElementById('save-profile-btn');

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const data = await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ penName: name, handle, bio })
    });
    Auth.setSession(Auth.getToken(), data.user);
    renderAuthorProfile(data.user);
    alert('✅ Profile saved.');
  } catch(err){
    alert(err.message || 'Could not save profile.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Profile';
  }
}

async function updateAuthorPassword(){
  const current = document.getElementById('settings-current-password').value;
  const next = document.getElementById('settings-new-password').value;
  const confirmVal = document.getElementById('settings-confirm-password').value;
  const btn = document.getElementById('update-password-btn');

  if(!current || !next || !confirmVal){ alert('Please fill in all password fields.'); return; }
  if(next !== confirmVal){ alert('New passwords do not match.'); return; }
  if(next.length < 8){ alert('New password must be at least 8 characters.'); return; }

  btn.disabled = true;
  btn.textContent = 'Updating…';
  try {
    await apiFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    });
    alert('✅ Password updated.');
    document.getElementById('settings-current-password').value = '';
    document.getElementById('settings-new-password').value = '';
    document.getElementById('settings-confirm-password').value = '';
  } catch(err){
    alert(err.message || 'Could not update password.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

/* ═══════════════════════════════════════════════
   READER SETTINGS
═══════════════════════════════════════════════ */

async function saveReaderProfile(){
  const name = document.getElementById('reader-settings-name').value.trim();
  const btn = document.getElementById('reader-save-profile-btn');

  if(!name){ alert('Please enter your name.'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const data = await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
    Auth.setSession(Auth.getToken(), data.user);
    document.querySelectorAll('.user-display-name').forEach(el => { el.textContent = data.user.name || data.user.email; });
    alert('✅ Profile saved.');
  } catch(err){
    alert(err.message || 'Could not save profile.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Profile';
  }
}

async function updateReaderPassword(){
  const current = document.getElementById('reader-settings-current-password').value;
  const next = document.getElementById('reader-settings-new-password').value;
  const confirmVal = document.getElementById('reader-settings-confirm-password').value;
  const btn = document.getElementById('reader-update-password-btn');

  if(!current || !next || !confirmVal){ alert('Please fill in all password fields.'); return; }
  if(next !== confirmVal){ alert('New passwords do not match.'); return; }
  if(next.length < 8){ alert('New password must be at least 8 characters.'); return; }

  btn.disabled = true;
  btn.textContent = 'Updating…';
  try {
    await apiFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    });
    alert('✅ Password updated.');
    document.getElementById('reader-settings-current-password').value = '';
    document.getElementById('reader-settings-new-password').value = '';
    document.getElementById('reader-settings-confirm-password').value = '';
  } catch(err){
    alert(err.message || 'Could not update password.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

/* ═══════════════════════════════════════════════
   MOBILE STORE FILTERS DRAWER
═══════════════════════════════════════════════ */

function toggleStoreFilters(){
  const sidebar = document.getElementById('store-sidebar');
  const backdrop = document.getElementById('store-sidebar-backdrop');
  if(!sidebar || !backdrop) return;
  sidebar.classList.toggle('mobile-open');
  backdrop.classList.toggle('mobile-open');
}

/* ═══════════════════════════════════════════════
   REPORT CONTENT
═══════════════════════════════════════════════ */

function openReportModal(){
  if(!SELECTED_PRODUCT){ alert('Please open a product first.'); return; }
  document.getElementById('report-step-1').style.display = 'block';
  document.getElementById('report-step-2').style.display = 'none';
  document.getElementById('report-error').style.display = 'none';
  document.getElementById('report-reason').value = 'copyright';
  document.getElementById('report-details').value = '';
  const modal = document.getElementById('report-modal');
  modal.style.display = 'flex';
}

function hideReportModal(){
  const modal = document.getElementById('report-modal');
  if(modal) modal.style.display = 'none';
}

async function submitReport(){
  const errorBox = document.getElementById('report-error');
  errorBox.style.display = 'none';

  if(!SELECTED_PRODUCT){ return; }

  const reason = document.getElementById('report-reason').value;
  const details = document.getElementById('report-details').value.trim();

  const btn = document.getElementById('report-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    await apiFetch('/reports', {
      method: 'POST',
      body: JSON.stringify({ productId: SELECTED_PRODUCT._id, reason, details })
    });
    document.getElementById('report-step-1').style.display = 'none';
    document.getElementById('report-step-2').style.display = 'block';
  } catch(err){
    errorBox.textContent = err.message || 'Could not submit report. Please try again.';
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Report';
  }
}

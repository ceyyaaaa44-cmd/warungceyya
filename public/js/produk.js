(function () {
  'use strict';
  const app = window.Warung;

  let categories = [];
  let currentCatId = 'Semua';
  let currentSearch = '';

  const UNITS = ['Porsi', 'Pcs', 'Gelas', 'Botol', 'Pack', 'Kg', 'Lusin'];
  const EMOJIS = ['🍔', '🍕', '🍟', '🍜', '🍲', '🍗', '🥟', '🍛', '🥪', '🧋', '🥤', '🍊', '🥭', '☕', '🍵', '💧', '🍨', '🍩', '🍫', '🍞', '🥨', '🍥', '🛍️'];

  /* ------------------------------ barcode ------------------------------ */

  function generateBarcode() {
    const prefix = '899';
    let code = prefix;
    for (let i = prefix.length; i < 12; i++) code += Math.floor(Math.random() * 10);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    code += String((10 - (sum % 10)) % 10);
    return code;
  }

  function renderBarcodeSVG(code, target) {
    const el = document.getElementById(target);
    if (!el || !code) { if (el) el.innerHTML = ''; return; }
    try {
      const digits = code.replace(/\D/g, '');
      if (digits.length < 4) { el.innerHTML = '<span style="font-size:11px;color:#999">Terlalu pendek</span>'; return; }
      const W = 2, H = 40, PAD = 10;
      const bars = [];
      const EAN_L = [[0,0,0,1,1,0,1],[0,0,1,1,0,0,1],[0,1,0,0,1,0,1],[0,1,1,1,0,0,1],[1,0,0,0,0,1,1],[1,0,1,1,0,0,1],[1,1,0,0,0,0,1],[1,1,0,1,1,0,1],[1,1,1,0,0,0,1],[1,1,1,1,1,0,1]];
      const EAN_R = [[1,1,1,0,0,1,0],[1,1,0,0,1,1,0],[1,1,0,1,1,0,0],[1,0,0,0,0,1,0],[1,0,1,1,1,0,0],[1,1,0,0,0,1,0],[1,0,0,1,0,0,0],[1,0,0,0,1,0,0],[1,0,0,1,0,0,0],[1,1,1,0,0,1,0]];
      bars.push(0, 0, 1, 0);
      const half = Math.min(6, Math.ceil(digits.length / 2));
      for (let i = 0; i < half; i++) { const d = parseInt(digits[i]) || 0; const pat = EAN_L[d] || EAN_L[0]; pat.forEach((v) => bars.push(v ? 1 : 0)); if (i < half - 1) bars.push(0); }
      bars.push(1, 0, 1, 0);
      for (let i = half; i < digits.length; i++) { const d = parseInt(digits[i]) || 0; const pat = EAN_R[d] || EAN_R[0]; pat.forEach((v) => bars.push(v ? 1 : 0)); if (i < digits.length - 1) bars.push(0); }
      bars.push(0, 1, 0, 0, 1, 0, 1);
      const totalW = PAD * 2 + bars.length * W;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H + 16}" width="${totalW}" height="${H + 16}" style="display:block">`;
      svg += `<rect width="${totalW}" height="${H + 16}" fill="white"/>`;
      let x = PAD;
      bars.forEach((b) => { if (b) svg += `<rect x="${x}" y="2" width="${W}" height="${H}" fill="black"/>`; x += W; });
      svg += `<text x="${totalW / 2}" y="${H + 14}" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">${digits}</text>`;
      svg += '</svg>';
      el.innerHTML = svg;
    } catch (e) {
      el.innerHTML = '<span style="font-size:11px;color:#999">Gagal render barcode</span>';
    }
  }

  function showBarcodePreview(code) {
    try {
      var wrap = document.getElementById('barcode-preview');
      if (!wrap) return;
      if (!code) { wrap.classList.add('hidden'); return; }
      wrap.classList.remove('hidden');
      renderBarcodeSVG(code, 'barcode-svg');
    } catch (e) { /* ignore */ }
  }

  function printBarcode(code, name) {
    const w = window.open('', '_blank');
    if (!w) { app.toast('Izinkan popup untuk mencetak.', 'info'); return; }
    const svgEl = document.getElementById('barcode-svg');
    const svgData = svgEl ? svgEl.outerHTML : '';
    w.document.write(`<!DOCTYPE html><html><head><title>Barcode - ${name}</title><style>
      body{font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0}
      .label{text-align:center;margin-top:8px;font-size:11px;font-weight:600}
      .code{font-family:monospace;font-size:10px;color:#666}
    </style></head><body>
      ${svgData}
      <div class="label">${name}</div>
      <div class="code">${code}</div>
      <script>window.onload=function(){window.print()};<\/script>
    </body></html>`);
    w.document.close();
  }

  /* ------------------------------ emoji / unit ------------------------------ */

  function buildEmojiPicker(selected) {
    const wrap = document.getElementById('emoji-picker');
    wrap.innerHTML = EMOJIS.map((e) => `
      <button type="button" data-emoji="${e}"
        class="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${e === selected ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100 bg-white border border-gray-200'}">
        ${e}
      </button>`).join('');
    wrap.querySelectorAll('[data-emoji]').forEach((b) =>
      b.addEventListener('click', () => { document.getElementById('emoji-preview').textContent = b.dataset.emoji; buildEmojiPicker(b.dataset.emoji); })
    );
  }

  function fillUnits(selected) {
    const sel = document.getElementById('f-unit');
    sel.innerHTML = UNITS.map((u) => '<option value="' + u + '">' + u + '</option>').join('');
    if (selected) sel.value = selected;
  }

  function fillCategories(selectedId) {
    const sel = document.getElementById('f-category');
    sel.innerHTML = categories.map((c) => '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>').join('');
    if (selectedId) sel.value = selectedId;
  }

  /* ------------------------------ table ------------------------------ */

  function stockBadge(stock) {
    if (stock <= 0) return '<span class="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Habis</span>';
    if (stock <= 60) return '<span class="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">' + stock + '</span>';
    return '<span class="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">' + stock + '</span>';
  }

  function statusBadge(s) {
    if (s === 'aktif') return '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Aktif</span>';
    return '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>Nonaktif</span>';
  }

  function catChip(p) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style="background:${p.categoryColor}18;color:${p.categoryColor}">
      ${p.categoryIcon} ${p.category}</span>`;
  }

  function render(products) {
    const tbody = document.getElementById('product-rows');
    window.__wcProducts = products;
    const foot = document.getElementById('table-foot');
    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-16 text-center"><div class="text-4xl mb-3">🔍</div><p class="font-semibold text-gray-700">Produk tidak ditemukan</p></td></tr>`;
      foot.classList.add('hidden');
      return;
    }
    foot.classList.remove('hidden');
    document.getElementById('result-count').textContent = products.length + ' produk';

    tbody.innerHTML = products.map((p) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition group">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            ${app.renderProductImage(p, 'w-11 h-11 rounded-xl')}
            <div>
              <p class="font-semibold text-gray-800">${p.name}</p>
              <p class="text-xs text-gray-400">${p.unit} · ${p.barcode || 'tanpa barcode'}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-3.5 font-semibold text-gray-800 whitespace-nowrap">${app.formatT(p.price)}</td>
        <td class="px-6 py-3.5 text-gray-500 whitespace-nowrap">${app.formatT(p.modal)}</td>
        <td class="px-6 py-3.5 whitespace-nowrap">${stockBadge(p.stock)}</td>
        <td class="px-6 py-3.5">${catChip(p)}</td>
        <td class="px-6 py-3.5">${statusBadge(p.status)}</td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2">
            <button data-edit="${p.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition" style="pointer-events:auto">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
            </button>
            <button data-del="${p.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition" style="pointer-events:auto">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
            </button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  }

  function load() {
    const params = new URLSearchParams();
    if (currentSearch) params.set('q', currentSearch);
    if (currentCatId !== 'Semua') params.set('catId', currentCatId);
    return app.get('api/products?' + params.toString())
      .then((d) => { render(d.products); buildPills(); })
      .catch((e) => {
        app.toast(e.message || 'Gagal memuat produk.', 'error');
        app.clearSkeleton('product-rows', '<tr><td colspan="7" class="px-6 py-12 text-center text-sm text-red-400">Gagal memuat produk.</td></tr>');
      });
  }

  function buildPills() {
    const pills = document.getElementById('category-pills');
    pills.innerHTML = [{ id: 'Semua', name: 'Semua', icon: '📦' }, ...categories].map((c) => `
      <button data-pill="${c.id}" class="px-3 py-2 rounded-full text-xs font-medium transition whitespace-nowrap
        ${c.id === currentCatId ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'}">
        ${c.icon} ${c.name}
      </button>`).join('');
    pills.querySelectorAll('[data-pill]').forEach((b) =>
      b.addEventListener('click', () => { currentCatId = b.dataset.pill; load(); })
    );
  }

  /* --------------------------------- modal --------------------------------- */

  function openModal(title, product) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('product-id').value = product ? product.id : '';
    document.getElementById('f-name').value = product ? product.name : '';
    document.getElementById('f-price').value = product ? product.price.toLocaleString('id-ID') : '';
    document.getElementById('f-modal').value = product ? product.modal.toLocaleString('id-ID') : '';
    document.getElementById('f-stock').value = product ? product.stock : '';
    document.getElementById('f-barcode').value = product ? (product.barcode || '') : '';
    fillCategories(product ? product.categoryId : (categories[0] ? categories[0].id : ''));
    fillUnits(product ? product.unit : 'Porsi');
    const current = product ? product.emoji : '🛍️';
    document.getElementById('emoji-preview').textContent = current;
    buildEmojiPicker(current);
    document.querySelectorAll('input[name="f-status"]').forEach((r) => {
      r.checked = product ? r.value === (product.status || 'aktif') : r.value === 'aktif';
    });
    var imgUrl = product ? (product.image || '') : '';
    document.getElementById('f-image-url').value = imgUrl;
    var previewImg = document.getElementById('preview-img');
    var previewEmoji = document.getElementById('emoji-preview');
    var btnClear = document.getElementById('btn-clear-img');
    if (imgUrl) {
      previewImg.src = imgUrl;
      previewImg.classList.remove('hidden');
      previewEmoji.classList.add('hidden');
      btnClear.classList.remove('hidden');
    } else {
      previewImg.src = '';
      previewImg.classList.add('hidden');
      previewEmoji.classList.remove('hidden');
      btnClear.classList.add('hidden');
    }
    document.getElementById('f-image-file').value = '';
    showBarcodePreview(product ? (product.barcode || '') : '');
    var modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(function () { document.getElementById('f-name').focus(); }, 60);
  }

  function closeModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-modal').classList.remove('flex');
  }

  function openEdit(id) {
    const p = (window.__wcProducts || []).find((x) => x.id === id);
    if (p) openModal('Edit Produk', p);
  }
  function openDelete(id) {
    const p = (window.__wcProducts || []).find((x) => x.id === id);
    if (!p) return;
    app.confirm({
      title: 'Hapus Produk',
      message: 'Yakin ingin menghapus <b>' + p.name + '</b>?',
      onConfirm: () => app.del('api/products/' + id)
        .then(() => { app.toast('Produk berhasil dihapus.'); load(); })
        .catch((e) => app.toast(e.message || 'Gagal menghapus.', 'error')),
    });
  }

  /* --------------------------------- save --------------------------------- */

  function saveProduct(form) {
    const id = document.getElementById('product-id').value;
    const status = document.querySelector('input[name="f-status"]:checked');
    const payload = {
      name: document.getElementById('f-name').value.trim(),
      categoryId: document.getElementById('f-category').value,
      unit: document.getElementById('f-unit').value,
      barcode: document.getElementById('f-barcode').value.trim(),
      price: app.escapeInput.toNumber(document.getElementById('f-price').value),
      modal: app.escapeInput.toNumber(document.getElementById('f-modal').value),
      stock: parseInt(document.getElementById('f-stock').value, 10),
      emoji: document.getElementById('emoji-preview').textContent,
      image: document.getElementById('f-image-url').value.trim(),
      status: status ? status.value : 'aktif',
    };
    if (!payload.name) { app.toast('Nama produk wajib diisi.', 'error'); return; }
    if (isNaN(payload.stock) || payload.stock < 0) { app.toast('Stok tidak valid.', 'error'); return; }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
    (id ? app.put('api/products/' + id, payload) : app.post('api/products', payload))
      .then(() => {
        app.toast(id ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
        closeModal();
        load();
      })
      .catch((err) => app.toast(err.message || 'Gagal menyimpan.', 'error'))
      .finally(() => { btn.disabled = false; btn.textContent = 'Simpan'; });
  }

  /* --------------------------------- boot --------------------------------- */

  app.boot(() => {
    document.addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-edit]');
      if (editBtn) { openEdit(editBtn.getAttribute('data-edit')); return; }
      var delBtn = e.target.closest('[data-del]');
      if (delBtn) { openDelete(delBtn.getAttribute('data-del')); return; }
    });

    document.getElementById('product-form').addEventListener('submit', (e) => { e.preventDefault(); saveProduct(e); });
    document.getElementById('btn-save').addEventListener('click', () => document.getElementById('product-form').requestSubmit());
    document.getElementById('btn-add').addEventListener('click', () => openModal('Tambah Produk', null));
    document.getElementById('search-input').addEventListener('input', app.debounce(function () {
      currentSearch = this.value.trim();
      load();
    }, 300));
    ['f-price', 'f-modal'].forEach((id) => {
      document.getElementById(id).addEventListener('input', function () { this.value = app.escapeInput.toDisplay(this.value); });
    });
    document.querySelectorAll('#product-modal [data-close]').forEach((el) => el.addEventListener('click', closeModal));

    document.getElementById('btn-upload-img').addEventListener('click', () => document.getElementById('f-image-file').click());
    document.getElementById('f-image-file').addEventListener('change', function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('preview-img').src = e.target.result;
          document.getElementById('preview-img').classList.remove('hidden');
          document.getElementById('emoji-preview').classList.add('hidden');
          document.getElementById('f-image-url').value = e.target.result;
          document.getElementById('btn-clear-img').classList.remove('hidden');
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
    document.getElementById('f-image-url').addEventListener('input', function () {
      const url = this.value.trim();
      if (url) {
        document.getElementById('preview-img').src = url;
        document.getElementById('preview-img').classList.remove('hidden');
        document.getElementById('emoji-preview').classList.add('hidden');
        document.getElementById('btn-clear-img').classList.remove('hidden');
      }
    });
    document.getElementById('btn-clear-img').addEventListener('click', () => {
      document.getElementById('preview-img').src = '';
      document.getElementById('preview-img').classList.add('hidden');
      document.getElementById('emoji-preview').classList.remove('hidden');
      document.getElementById('f-image-url').value = '';
      document.getElementById('f-image-file').value = '';
      document.getElementById('btn-clear-img').classList.add('hidden');
    });

    document.getElementById('btn-gen-barcode').addEventListener('click', () => {
      var code = generateBarcode();
      document.getElementById('f-barcode').value = code;
      showBarcodePreview(code);
    });
    document.getElementById('f-barcode').addEventListener('input', function () {
      showBarcodePreview(this.value.trim());
    });
    document.getElementById('btn-print-barcode').addEventListener('click', () => {
      var code = document.getElementById('f-barcode').value.trim();
      var name = document.getElementById('f-name').value.trim() || 'Produk';
      if (!code) { app.toast('Barcode kosong.', 'error'); return; }
      printBarcode(code, name);
    });

    var produkQrCode = null;
    function openProdukScanner() {
      var modal = document.getElementById('produk-scanner-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (!produkQrCode) produkQrCode = new Html5Qrcode('produk-reader');
      produkQrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        function (decodedText) {
          closeProdukScanner();
          document.getElementById('f-barcode').value = decodedText;
          showBarcodePreview(decodedText);
          app.toast('Barcode berhasil di-scan: ' + decodedText);
        },
        function () {}
      ).catch(function () { app.toast('Tidak dapat mengakses kamera.', 'error'); });
    }
    function closeProdukScanner() {
      if (produkQrCode && produkQrCode.isScanning) produkQrCode.stop().catch(function () {});
      var modal = document.getElementById('produk-scanner-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    document.getElementById('btn-scan-barcode-modal').addEventListener('click', openProdukScanner);
    document.getElementById('btn-close-produk-scanner').addEventListener('click', closeProdukScanner);
    document.querySelectorAll('#produk-scanner-modal [data-close-scanner]').forEach((el) => el.addEventListener('click', closeProdukScanner));

    app.get('api/categories').then((c) => { categories = c.categories; return load(); }).catch((e) => {
      app.toast(e.message, 'error');
      app.clearSkeleton('product-rows', '<tr><td colspan="7" class="px-6 py-12 text-center text-sm text-red-400">Gagal memuat kategori.</td></tr>');
    });
  });
})();
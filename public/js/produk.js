(function () {
  'use strict';
  const app = window.Warung;

  let categories = [];
  let currentCatId = 'Semua';
  let currentSearch = '';

  const UNITS = ['Porsi', 'Pcs', 'Gelas', 'Botol', 'Pack', 'Kg', 'Lusin'];
  const EMOJIS = ['🍔', '🍕', '🍟', '🍜', '🍲', '🍗', '🥟', '🍛', '🥪', '🧋', '🥤', '🍊', '🥭', '☕', '🍵', '💧', '🍨', '🍩', '🍫', '🍞', '🥨', '🍥', '🛍️'];

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
            <div class="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shrink-0">${p.emoji}</div>
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
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-edit="${p.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
            </button>
            <button data-del="${p.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
            </button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();

    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => openDelete(b.dataset.del)));
  }

  function load() {
    const params = new URLSearchParams();
    if (currentSearch) params.set('q', currentSearch);
    if (currentCatId !== 'Semua') params.set('catId', currentCatId);
    return app.get('api/products?' + params.toString())
      .then((d) => { render(d.products); buildPills(); })
      .catch((e) => app.toast(e.message || 'Gagal memuat produk.', 'error'));
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
    const modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('f-name').focus(), 60);
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

    app.get('api/categories').then((c) => { categories = c.categories; return load(); }).catch((e) => app.toast(e.message, 'error'));
  });
})();
(function () {
  'use strict';
  const app = window.Warung;

  const LOGOS = ['🏪', '🍔', '🍕', '🥤', '🍜', '🍩', '☕', '🛒', '🏠', '⭐'];
  let logo = '🏪';

  function buildLogoPicker(sel) {
    logo = sel;
    document.getElementById('logo-picker').innerHTML = LOGOS.map((e) => `
      <button type="button" data-logo="${e}" class="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${e === sel ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white border border-gray-200 hover:bg-gray-100'}">${e}</button>`).join('');
    document.querySelectorAll('[data-logo]').forEach((b) => b.addEventListener('click', () => { document.getElementById('logo-preview').textContent = b.dataset.logo; buildLogoPicker(b.dataset.logo); }));
  }

  function load() {
    return app.get('api/settings').then((s) => {
      document.getElementById('set-name').value = s.storeName || '';
      document.getElementById('set-phone').value = s.phone || '';
      document.getElementById('set-address').value = s.address || '';
      document.getElementById('set-tagline').value = s.tagline || '';
      document.getElementById('set-printer').value = s.printer || 'thermal';
      document.getElementById('set-tax').value = s.taxRate || 0;
      document.getElementById('set-discount').value = app.escapeInput.toDisplay(s.discountDefault || 0);
      logo = s.logo || '🏪';
      document.getElementById('logo-preview').textContent = logo;
      buildLogoPicker(logo);
    }).catch((e) => app.toast(e.message, 'error'));
  }

  function save(e) {
    e.preventDefault();
    const payload = {
      storeName: document.getElementById('set-name').value.trim(),
      phone: document.getElementById('set-phone').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      tagline: document.getElementById('set-tagline').value.trim(),
      printer: document.getElementById('set-printer').value,
      taxRate: parseInt(document.getElementById('set-tax').value, 10),
      discountDefault: app.escapeInput.toNumber(document.getElementById('set-discount').value),
      logo,
    };
    app.put('api/settings', payload)
      .then(() => app.toast('Pengaturan berhasil disimpan.'))
      .catch((err) => app.toast(err.message || 'Gagal menyimpan.', 'error'));
  }

  function backup() {
    window.location.href = 'api/backup';
  }

  function restore(file) {
    const reader = new FileReader();
    reader.onload = () => {
      app.post('api/restore', { data: reader.result })
        .then(() => { app.toast('Database berhasil dipulihkan.'); setTimeout(() => window.location.reload(), 800); })
        .catch((err) => app.toast(err.message || 'Restore gagal.', 'error'));
    };
    reader.readAsText(file);
  }

  app.boot(() => {
    document.getElementById('settings-form').addEventListener('submit', save);
    document.getElementById('set-discount').addEventListener('input', function () { this.value = app.escapeInput.toDisplay(this.value); });
    document.getElementById('btn-backup').addEventListener('click', backup);
    document.getElementById('restore-input').addEventListener('change', function () {
      if (this.files && this.files[0]) restore(this.files[0]);
      this.value = '';
    });
    load();
  });
})();
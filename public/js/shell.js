(function () {
  'use strict';
  const app = window.Warung;

  async function boot(renderContent) {
    let user = null;
    try {
      const stored = localStorage.getItem('warung_user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {}

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    app.renderShell(user);
    if (typeof renderContent === 'function') renderContent(user);
  }

  app.boot = boot;
})();
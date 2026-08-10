(function () {
  'use strict';
  const app = window.Warung;

  async function boot(renderContent) {
    // Mock user for display
    const user = { id: 'usr_admin', username: 'admin', name: 'Admin Warung', role: 'admin', email: 'admin@warungceyya.id' };
    app.renderShell(user);
    if (typeof renderContent === 'function') renderContent(user);
  }

  app.boot = boot;
})();
 const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  // OPEN SIDEBAR
  function toggleSidebar() {
  sidebar.classList.add('open');
overlay.classList.add('show');
      setTimeout(() => window.__opened = true, 300);
  }

  // PROFILE MENU TOGGLE
  function toggleProfileMenu() {

      document.getElementById('profileMenu').classList.toggle('active');
  }

  // GLOBAL CLICK HANDLER
  document.addEventListener('click', function (event) {
      const menu = document.getElementById('profileMenu');
      const trigger = document.querySelector('.profile-trigger');

      // Close profile menu
      if (menu && trigger && !menu.contains(event.target) && !trigger.contains(event.target)) {
          menu.classList.remove('active');
      }

      // Close sidebar on mobile
      if (
          window.innerWidth <= 900 &&
          window.__opened && sidebar.classList.contains('open')
      ) {
          sidebar.classList.remove('open');
          overlay.classList.remove('show');
          setTimeout(() => window.__opened = false, 300)
      }
  });

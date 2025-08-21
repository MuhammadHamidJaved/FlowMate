// Change Username - Standalone wiring (mobile-friendly, works with Firebase v8 compat)
(function () {
  // Utilities
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function openModal() {
    const modal = qs('#change-username-modal');
    const err = qs('#change-username-error');
    const ok = qs('#change-username-success');
    const input = qs('#new-username-input');
    if (!modal) return;
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    if (ok)  { ok.style.display = 'none'; ok.textContent = ''; }
    if (input) { input.value = ''; input.focus(); }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body && (document.body.style.overflow = 'hidden');
  }

  function closeModal() {
    const modal = qs('#change-username-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.add('hidden');
    document.body && (document.body.style.overflow = '');
  }

  async function isUsernameTaken(username) {
    if (!window.firebaseDB) throw new Error('Firestore not available');
    const snap = await window.firebaseDB
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const btn = qs('#submit-change-username');
    const input = qs('#new-username-input');
    const err = qs('#change-username-error');
    const ok  = qs('#change-username-success');

    if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
      if (err) { err.textContent = 'Please sign in first.'; err.style.display = 'block'; }
      return;
    }

    const username = (input?.value || '').trim();
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    if (!re.test(username)) {
      if (err) { err.textContent = 'Invalid username. Use 3–20 letters/numbers/_'; err.style.display = 'block'; }
      return;
    }

    const user = window.firebaseAuth.currentUser;
    const currentDisplay = user.displayName || (user.email ? user.email.split('@')[0] : '');
    if (username.toLowerCase() === currentDisplay.toLowerCase()) {
      if (err) { err.textContent = 'This is already your current name.'; err.style.display = 'block'; }
      return;
    }

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
      const taken = await isUsernameTaken(username);
      if (taken) {
        if (err) { err.textContent = 'Username is taken. Choose another.'; err.style.display = 'block'; }
        return;
      }

      // 1) Update Auth displayName
      await user.updateProfile({ displayName: username });

      // 2) Update Firestore users/{uid}
      await window.firebaseDB.collection('users').doc(user.uid).update({
        username,
        displayName: username,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 3) Update UI immediately
      const userUsernameEl = qs('#user-username'); // (index.html line ~1073)
      if (userUsernameEl) userUsernameEl.textContent = username;

      const profileName = qs('#profile-name'); // (index.html line ~1052)
      if (profileName) {
        profileName.value = username;
        profileName.setAttribute('data-original', username);
      }

      const avatar = qs('.avatar'); // (index.html line ~65)
      if (avatar) {
        avatar.textContent = (username.substring(0,2) || 'U').toUpperCase();
      }

      // there are multiple welcome-title occurrences; update the first visible
      qsa('.welcome-title').forEach(el => { el.textContent = `Hello, ${username}`; });

      if (ok) { ok.textContent = 'Username updated successfully.'; ok.style.display = 'block'; }
      setTimeout(closeModal, 400);
    } catch (e) {
      console.error(e);
      if (err) { err.textContent = 'Update failed. Please try again.'; err.style.display = 'block'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
  }

  function wireOnce() {
    const btn = qs('#change-username-btn');
    const form = qs('#change-username-form');
    const closeBtn = qs('#close-change-username');
    const cancelBtn = qs('#cancel-change-username');
    const modal = qs('#change-username-modal');

    if (btn && !btn._wired) {
      btn.addEventListener('click', openModal);
      btn._wired = true;
    }
    if (form && !form._wired) {
      form.addEventListener('submit', handleSubmit);
      form._wired = true;
    }
    if (closeBtn && !closeBtn._wired) {
      closeBtn.addEventListener('click', closeModal);
      closeBtn._wired = true;
    }
    if (cancelBtn && !cancelBtn._wired) {
      cancelBtn.addEventListener('click', closeModal);
      cancelBtn._wired = true;
    }
    // Close when clicking on overlay
    if (modal && !modal._wired) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      modal._wired = true;
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireOnce);
  } else {
    wireOnce();
  }

  // Also re-wire when ينتقل المستخدم لصفحة الإعدادات عبر النافيقيشن
  // لأن الصفحة عندك Single Page ويعاد حقن العناصر
  window.addEventListener('popstate', wireOnce);
  document.addEventListener('click', function(e) {
    // إذا فيه نظام تبويب يغير #settings-page، خلنا نحاول نوصل له بعد تغيّر الـ DOM
    const id = (e.target && e.target.id) || '';
    if (id.startsWith('nav-') || id.includes('settings')) {
      setTimeout(wireOnce, 50);
    }
  });

})();

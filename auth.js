/* ═══════════════════════════════════════════════
   auth.js — Yorha Authentication Module
   All API calls for login, register, and session
   management live here.
═══════════════════════════════════════════════ */

const API_BASE = 'https://yorha-backend.onrender.com/api'; // ← change to your Railway URL on deploy

/* ─── Storage helpers ─── */
const Auth = {
  setSession(token, user) {
    localStorage.setItem('yorha_token', token);
    localStorage.setItem('yorha_user', JSON.stringify(user));
  },
  getToken() {
    return localStorage.getItem('yorha_token');
  },
  getUser() {
    const u = localStorage.getItem('yorha_user');
    return u ? JSON.parse(u) : null;
  },
  clear() {
    localStorage.removeItem('yorha_token');
    localStorage.removeItem('yorha_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  }
};

/* ─── Fetch wrapper — auto-attaches Bearer token ─── */
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // BUG FIX: every backend error response uses { error: '...' }, and
    // express-validator failures use { errors: [{ msg: '...' }, ...] } —
    // neither of which is `data.message`. Reading only `data.message` meant
    // every failed request (wrong password, duplicate email, missing
    // field, whatever) showed a generic "Request failed (400)" instead of
    // the actual reason, no matter how good the backend's error text was.
    const backendMessage =
      data.error ||
      data.message ||
      (Array.isArray(data.errors) && data.errors[0]?.msg);
    const err = new Error(backendMessage || `Request failed (${res.status})`);
    // Carries flags like `unverified` through to the caller, e.g. so the
    // login handler can show a "Resend verification email" button.
    err.data = data;
    throw err;
  }
  return data;
}

/* ─── UI helpers ─── */
function setAuthError(boxId, message) {
  let err = document.getElementById(boxId + '-error');
  if (!err) {
    err = document.createElement('div');
    err.id = boxId + '-error';
    err.className = 'auth-error';
    // inject after the subtitle
    const box = document.getElementById(boxId);
    const sub = box.querySelector('.auth-sub');
    sub.insertAdjacentElement('afterend', err);
  }
  err.textContent = message;
  err.style.display = message ? 'block' : 'none';
}

function clearAuthError(boxId) {
  setAuthError(boxId, '');
}

function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.textContent = 'Please wait…';
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.original;
  }
}

/* ─── Email verification UI helpers ─── */

// Same error box as setAuthError, but appends a "Resend verification
// email" link — shown when login fails specifically because the account
// isn't verified yet (see the `unverified` flag on the login error).
function setAuthErrorWithResend(boxId, message, role, email) {
  setAuthError(boxId, message);
  const err = document.getElementById(boxId + '-error');
  const link = document.createElement('a');
  link.textContent = ' Resend verification email';
  link.style.cssText = 'display:block;margin-top:6px;cursor:pointer;text-decoration:underline;';
  link.onclick = () => resendVerification(role, email, err);
  err.appendChild(link);
}

async function resendVerification(role, email, errEl) {
  if (!email) { return; }
  const original = errEl.innerHTML;
  errEl.innerHTML = 'Sending…';
  try {
    await apiFetch('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
    errEl.innerHTML = '✅ Verification email sent — check your inbox.';
  } catch (err) {
    errEl.innerHTML = original;
  }
}

// Swaps the login/register boxes for a "check your email" state after a
// successful registration — register no longer logs the user in directly.
function showCheckEmailBox(role, email) {
  document.getElementById(role + '-login-box').style.display = 'none';
  document.getElementById(role + '-register-box').style.display = 'none';
  const box = document.getElementById(role + '-check-email-box');
  document.getElementById(role + '-check-email-address').textContent = email;
  box._email = email; // stashed for the Resend button in this box
  box.style.display = 'block';
}

function backToLoginFromCheckEmail(role) {
  document.getElementById(role + '-check-email-box').style.display = 'none';
  document.getElementById(role + '-login-box').style.display = 'block';
}

async function resendFromCheckEmailBox(role) {
  const box = document.getElementById(role + '-check-email-box');
  const btn = box.querySelector('.resend-btn');
  const status = box.querySelector('.resend-status');
  btn.disabled = true;
  status.textContent = 'Sending…';
  try {
    await apiFetch('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: box._email, role })
    });
    status.textContent = '✅ Sent! Check your inbox.';
  } catch (err) {
    status.textContent = err.message || 'Could not resend. Try again.';
  } finally {
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════
   READER AUTH
═══════════════════════════════════════════════ */

async function readerLogin() {
  const box = 'reader-login-box';
  clearAuthError(box);

  const email    = document.querySelector('#reader-login-box input[type="email"]').value.trim();
  const password = document.querySelector('#reader-login-box input[type="password"]').value;

  if (!email || !password) {
    setAuthError(box, 'Please enter your email and password.');
    return;
  }

  const btn = document.querySelector('#reader-login-box .btn-primary');
  setButtonLoading(btn, true);

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: 'reader' })
    });

    // Validate the returned role
    if (data.user.role !== 'reader') {
      setAuthError(box, 'This account is registered as an author. Please use the Author portal.');
      return;
    }

    Auth.setSession(data.token, data.user);
    onLoginSuccess('reader', data.user);

  } catch (err) {
    if (err.data?.unverified) {
      setAuthErrorWithResend(box, err.message, 'reader', email);
    } else {
      setAuthError(box, err.message || 'Login failed. Check your credentials.');
    }
  } finally {
    setButtonLoading(btn, false);
  }
}

async function readerRegister() {
  const box = 'reader-register-box';
  clearAuthError(box);

  const inputs   = document.querySelectorAll('#reader-register-box input');
  const name     = inputs[0].value.trim();
  const email    = inputs[1].value.trim();
  const password = inputs[2].value;
  const confirm  = inputs[3].value;

  if (!name || !email || !password || !confirm) {
    setAuthError(box, 'Please fill in all fields.');
    return;
  }
  if (password !== confirm) {
    setAuthError(box, 'Passwords do not match.');
    return;
  }
  if (password.length < 8) {
    setAuthError(box, 'Password must be at least 8 characters.');
    return;
  }

  const btn = document.querySelector('#reader-register-box .btn-primary');
  setButtonLoading(btn, true);

  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role: 'reader' })
    });

    // Register no longer logs the user in directly — the account needs
    // email verification first (see POST /auth/verify-email).
    showCheckEmailBox('reader', email);

  } catch (err) {
    setAuthError(box, err.message || 'Registration failed. Try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/* ═══════════════════════════════════════════════
   AUTHOR AUTH
═══════════════════════════════════════════════ */

async function authorLogin() {
  const box = 'author-login-box';
  clearAuthError(box);

  const email    = document.querySelector('#author-login-box input[type="email"]').value.trim();
  const password = document.querySelector('#author-login-box input[type="password"]').value;

  if (!email || !password) {
    setAuthError(box, 'Please enter your email and password.');
    return;
  }

  const btn = document.querySelector('#author-login-box .btn-green');
  setButtonLoading(btn, true);

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: 'author' })
    });

    if (data.user.role !== 'author') {
      setAuthError(box, 'This account is registered as a reader. Please use the Reader portal.');
      return;
    }

    Auth.setSession(data.token, data.user);
    onLoginSuccess('author', data.user);

  } catch (err) {
    if (err.data?.unverified) {
      setAuthErrorWithResend(box, err.message, 'author', email);
    } else {
      setAuthError(box, err.message || 'Login failed. Check your credentials.');
    }
  } finally {
    setButtonLoading(btn, false);
  }
}

async function authorRegister() {
  const box = 'author-register-box';
  clearAuthError(box);

  const inputs      = document.querySelectorAll('#author-register-box input');
  const name        = inputs[0].value.trim();
  const email       = inputs[1].value.trim();
  const password    = inputs[2].value;
  const contentType = document.querySelector('#author-register-box select').value;
  const bio         = document.querySelector('#author-register-box textarea').value.trim();

  if (!name || !email || !password) {
    setAuthError(box, 'Please fill in your name, email, and password.');
    return;
  }
  if (password.length < 8) {
    setAuthError(box, 'Password must be at least 8 characters.');
    return;
  }

  const btn = document.querySelector('#author-register-box .btn-green');
  setButtonLoading(btn, true);

  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      // BUG FIX: backend expects `contentTypes` (plural, array) to match
      // the User schema's `contentTypes: [String]` field — was sending
      // `contentType` (singular, a bare string), so the dropdown selection
      // was silently discarded on every author registration.
      body: JSON.stringify({ name, email, password, role: 'author', contentTypes: [contentType], bio })
    });

    showCheckEmailBox('author', email);

  } catch (err) {
    setAuthError(box, err.message || 'Registration failed. Try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/* ═══════════════════════════════════════════════
   POST-LOGIN ACTIONS
═══════════════════════════════════════════════ */

function onLoginSuccess(role, user) {
  // Populate any name/greeting elements
  document.querySelectorAll('.user-display-name').forEach(el => {
    el.textContent = user.name || user.email;
  });

  if (role === 'reader') {
    showPage('reader-home');
  } else {
    showPage('author-dashboard');
    loadAuthorDashboard(); // pulls real profile/works/earnings/payouts — replaces the old static demo content
  }
}

/* ─── Logout ─── */
function logout() {
  Auth.clear();
  // Clear form fields on logout for security
  document.querySelectorAll('.auth-form-box input, .auth-form-box textarea').forEach(el => {
    el.value = '';
  });
  showPage('landing');
}

/* ─── Route guard — call on any protected page ─── */
function requireAuth(expectedRole) {
  if (!Auth.isLoggedIn()) {
    showPage(expectedRole === 'reader' ? 'reader-auth' : 'author-auth');
    return false;
  }
  const user = Auth.getUser();
  if (user.role !== expectedRole) {
    showPage(expectedRole === 'reader' ? 'reader-auth' : 'author-auth');
    return false;
  }
  return true;
}

/* ─── Auto-restore session on page load ─── */
window.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    onLoginSuccess(user.role, user);
    // Check if returning from Paystack payment
    verifyPaystackReturn();
  }
});

/* ═══════════════════════════════════════════════
   FORGOT / RESET PASSWORD
═══════════════════════════════════════════════ */

function showForgotPassword(role) {
  const modal = document.getElementById('forgot-modal');
  modal.style.display = 'flex';
  // Check if there's a reset token in the URL
  const token = new URLSearchParams(window.location.search).get('token');
  if (token) {
    showForgotStep(3);
    modal._resetToken = token;
  } else {
    showForgotStep(1);
  }
}

function hideForgotModal() {
  document.getElementById('forgot-modal').style.display = 'none';
  // Clear inputs
  const fi = document.getElementById('forgot-email');
  const rp = document.getElementById('reset-password');
  const rc = document.getElementById('reset-confirm');
  if(fi) fi.value = '';
  if(rp) rp.value = '';
  if(rc) rc.value = '';
}

function showForgotStep(n) {
  [1,2,3,4].forEach(i => {
    const el = document.getElementById(`forgot-step-${i}`);
    if(el) el.style.display = i === n ? 'block' : 'none';
  });
}

async function submitForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  const btn = document.getElementById('forgot-submit-btn');

  errEl.style.display = 'none';
  if (!email) { errEl.textContent = 'Please enter your email.'; errEl.style.display = 'block'; return; }

  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    showForgotStep(2);
  } catch(err) {
    errEl.textContent = err.message || 'Something went wrong. Try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
}

async function submitResetPassword() {
  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-confirm').value;
  const errEl    = document.getElementById('reset-error');
  const btn      = document.getElementById('reset-submit-btn');
  const token    = document.getElementById('forgot-modal')._resetToken;

  errEl.style.display = 'none';

  if (!password || !confirm) { errEl.textContent = 'Please fill in both fields.'; errEl.style.display = 'block'; return; }
  if (password !== confirm)  { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return; }
  if (password.length < 8)   { errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = 'block'; return; }
  if (!token)                { errEl.textContent = 'Invalid reset link.'; errEl.style.display = 'block'; return; }

  btn.disabled = true;
  btn.textContent = 'Resetting…';

  try {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
    showForgotStep(4);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch(err) {
    errEl.textContent = err.message || 'Reset failed. The link may have expired.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset Password';
  }
}

// Auto-open reset modal if token is in URL on page load
window.addEventListener('DOMContentLoaded', () => {
  const token = new URLSearchParams(window.location.search).get('token');
  if (token) {
    const modal = document.getElementById('forgot-modal');
    if(modal) {
      modal._resetToken = token;
      modal.style.display = 'flex';
      showForgotStep(3);
    }
  }
});

/* ═══════════════════════════════════════════════
   EMAIL VERIFICATION
═══════════════════════════════════════════════ */

// Auto-runs when the person clicks the verification link in their email
// (CLIENT_URL?verify=TOKEN — see utils/email.js sendVerificationEmail).
window.addEventListener('DOMContentLoaded', () => {
  const verifyToken = new URLSearchParams(window.location.search).get('verify');
  if (verifyToken) {
    runEmailVerification(verifyToken);
  }
});

async function runEmailVerification(token) {
  const modal = document.getElementById('verify-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  showVerifyStep('verifying');

  try {
    const data = await apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });

    // Clean the token out of the URL either way, so a refresh doesn't
    // re-trigger verification.
    window.history.replaceState({}, document.title, window.location.pathname);

    showVerifyStep('success');
    Auth.setSession(data.token, data.user);

    // Small delay so the success state is actually visible before we
    // redirect into the app.
    setTimeout(() => {
      hideVerifyModal();
      onLoginSuccess(data.user.role, data.user);
    }, 1500);

  } catch (err) {
    window.history.replaceState({}, document.title, window.location.pathname);
    document.getElementById('verify-error-text').textContent =
      err.message || 'This verification link is invalid or has expired.';
    showVerifyStep('error');
  }
}

function showVerifyStep(step) {
  ['verifying', 'success', 'error'].forEach(s => {
    const el = document.getElementById('verify-step-' + s);
    if (el) el.style.display = s === step ? 'block' : 'none';
  });
}

function hideVerifyModal() {
  const modal = document.getElementById('verify-modal');
  if (modal) modal.style.display = 'none';
}

/* ═══════════════════════════════════════════════
   PAYSTACK CHECKOUT
═══════════════════════════════════════════════ */

async function initiatePaystackPayment(product) {
  const btn = document.querySelector('.pdetail-buy-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  try {
    const data = await apiFetch('/payments/paystack/initiate', {
      method: 'POST',
      body: JSON.stringify({ productId: product._id })
    });

    // Redirect to Paystack payment page
    window.location.href = data.authorization_url;

  } catch(err) {
    alert(err.message || 'Payment failed. Please try again.');
    if(btn) { btn.disabled = false; btn.textContent = `Buy Now — ₦${Number(product.price).toLocaleString()}`; }
  }
}

// ── Verify payment after returning from Paystack
async function verifyPaystackReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const reference = params.get('reference');

  if(payment === 'success' && reference) {
    try {
      const data = await apiFetch(`/payments/paystack/verify/${reference}`);
      if(data.status === 'success') {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Show success page
        showPaymentSuccess();
      }
    } catch(err) {
      console.error('Verification failed:', err.message);
    }
  }
}

function showPaymentSuccess() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const checkout = document.getElementById('page-reader-checkout');
  if(checkout) checkout.classList.add('active');
  const form = document.getElementById('checkout-form');
  const success = document.getElementById('purchase-success');
  if(form) form.style.display = 'none';
  if(success) success.classList.add('show');
  window.scrollTo(0,0);

  // Show reader nav
  document.getElementById('reader-nav').style.display = 'flex';
  document.getElementById('author-nav').style.display = 'none';
}

/* ═══════════════════════════════════════════════
   DELETE ACCOUNT
═══════════════════════════════════════════════ */

function showDeleteAccountModal() {
  const modal = document.getElementById('delete-account-modal');
  modal.style.display = 'flex';
  document.getElementById('delete-account-step-1').style.display = 'block';
  document.getElementById('delete-account-step-2').style.display = 'none';
  document.getElementById('delete-account-password').value = '';
  document.getElementById('delete-account-error').style.display = 'none';
}

function hideDeleteAccountModal() {
  document.getElementById('delete-account-modal').style.display = 'none';
}

async function submitDeleteAccount() {
  const password = document.getElementById('delete-account-password').value;
  const errEl    = document.getElementById('delete-account-error');
  const btn      = document.getElementById('delete-account-submit-btn');

  errEl.style.display = 'none';
  if (!password) {
    errEl.textContent = 'Please enter your password to confirm.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    await apiFetch('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });

    document.getElementById('delete-account-step-1').style.display = 'none';
    document.getElementById('delete-account-step-2').style.display = 'block';
  } catch (err) {
    errEl.textContent = err.message || 'Could not delete account. Try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete My Account';
  }
}

function finishDeleteAccount() {
  hideDeleteAccountModal();
  logout(); // clears session + local storage, returns to landing page
}

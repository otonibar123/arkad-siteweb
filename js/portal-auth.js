/* ========================================
   Arkad Consulting — Portal Authentication
   ======================================== */

/* --- Session Guard --- */
function guardAuth(callback) {
  _supabase.auth.getSession().then(function (result) {
    var session = result.data.session;
    if (!session) {
      window.location.href = 'portail.html';
      return;
    }
    callback(session);
  });
}

/* --- Login --- */
function handleLogin(email, password, onError) {
  _supabase.auth.signInWithPassword({
    email: email,
    password: password
  }).then(function (result) {
    if (result.error) {
      onError(result.error.message);
      return;
    }
    window.location.href = 'portail-dashboard.html';
  });
}

/* --- Sign Up --- */
function handleSignUp(email, password, fullName, onSuccess, onError) {
  _supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + '/portail.html'
    }
  }).then(function (result) {
    if (result.error) {
      onError(result.error.message);
      return;
    }
    onSuccess();
  });
}

/* --- Logout --- */
function handleLogout() {
  _supabase.auth.signOut().then(function () {
    window.location.href = 'portail.html';
  });
}

/* --- Password Reset --- */
function handlePasswordReset(email, onSuccess, onError) {
  _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/portail.html'
  }).then(function (result) {
    if (result.error) {
      onError(result.error.message);
      return;
    }
    onSuccess();
  });
}

/* --- Update Password (after recovery) --- */
function handleUpdatePassword(password, onSuccess, onError) {
  _supabase.auth.updateUser({
    password: password
  }).then(function (result) {
    if (result.error) {
      onError(result.error.message);
      return;
    }
    onSuccess();
  });
}

/* --- Portal Page Init --- */
function initPortalPage() {
  var views = document.querySelectorAll('.portal-view');
  var loginView = document.getElementById('view-login');
  var signupView = document.getElementById('view-signup');
  var resetView = document.getElementById('view-reset');
  var newPasswordView = document.getElementById('view-new-password');

  // Alert helpers
  function showAlert(viewId, type, message) {
    var alert = document.querySelector('#' + viewId + ' .portal-alert');
    if (!alert) return;
    alert.className = 'portal-alert portal-alert--' + type + ' portal-alert--visible';
    alert.textContent = message;
  }

  function clearAlerts() {
    var alerts = document.querySelectorAll('.portal-alert');
    for (var i = 0; i < alerts.length; i++) {
      alerts[i].className = 'portal-alert';
      alerts[i].textContent = '';
    }
  }

  // View switching
  function showView(id) {
    clearAlerts();
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('portal-view--active');
    }
    var target = document.getElementById(id);
    if (target) target.classList.add('portal-view--active');
  }

  // Navigation links
  var showSignupLinks = document.querySelectorAll('[data-show="signup"]');
  var showLoginLinks = document.querySelectorAll('[data-show="login"]');
  var showResetLinks = document.querySelectorAll('[data-show="reset"]');

  for (var i = 0; i < showSignupLinks.length; i++) {
    showSignupLinks[i].addEventListener('click', function (e) {
      e.preventDefault();
      showView('view-signup');
    });
  }
  for (var i = 0; i < showLoginLinks.length; i++) {
    showLoginLinks[i].addEventListener('click', function (e) {
      e.preventDefault();
      showView('view-login');
    });
  }
  for (var i = 0; i < showResetLinks.length; i++) {
    showResetLinks[i].addEventListener('click', function (e) {
      e.preventDefault();
      showView('view-reset');
    });
  }

  // Detect recovery token in URL (Supabase PKCE flow)
  var hash = window.location.hash;
  var params = new URLSearchParams(window.location.search);
  var isRecovery = false;

  if (hash && hash.indexOf('type=recovery') !== -1) {
    isRecovery = true;
  }
  if (params.get('type') === 'recovery') {
    isRecovery = true;
  }

  // Also listen for auth state change to detect recovery event
  _supabase.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      showView('view-new-password');
    }
  });

  if (isRecovery) {
    showView('view-new-password');
  } else {
    // If already logged in, redirect to dashboard
    _supabase.auth.getSession().then(function (result) {
      var session = result.data.session;
      if (session) {
        window.location.href = 'portail-dashboard.html';
      }
    });
  }

  // Login form
  var loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlerts();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      if (!email || !password) {
        showAlert('view-login', 'error', 'Veuillez remplir tous les champs.');
        return;
      }
      handleLogin(email, password, function (msg) {
        showAlert('view-login', 'error', translateError(msg));
      });
    });
  }

  // Signup form
  var signupForm = document.getElementById('form-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlerts();
      var fullName = document.getElementById('signup-name').value.trim();
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      if (!fullName || !email || !password) {
        showAlert('view-signup', 'error', 'Veuillez remplir tous les champs.');
        return;
      }
      if (password.length < 6) {
        showAlert('view-signup', 'error', 'Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      handleSignUp(email, password, fullName, function () {
        showAlert('view-signup', 'success', 'Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
      }, function (msg) {
        showAlert('view-signup', 'error', translateError(msg));
      });
    });
  }

  // Reset form
  var resetForm = document.getElementById('form-reset');
  if (resetForm) {
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlerts();
      var email = document.getElementById('reset-email').value.trim();
      if (!email) {
        showAlert('view-reset', 'error', 'Veuillez saisir votre email.');
        return;
      }
      handlePasswordReset(email, function () {
        showAlert('view-reset', 'success', 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.');
      }, function (msg) {
        showAlert('view-reset', 'error', translateError(msg));
      });
    });
  }

  // New password form
  var newPasswordForm = document.getElementById('form-new-password');
  if (newPasswordForm) {
    newPasswordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlerts();
      var password = document.getElementById('new-password').value;
      var confirm = document.getElementById('new-password-confirm').value;
      if (!password || !confirm) {
        showAlert('view-new-password', 'error', 'Veuillez remplir tous les champs.');
        return;
      }
      if (password.length < 6) {
        showAlert('view-new-password', 'error', 'Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (password !== confirm) {
        showAlert('view-new-password', 'error', 'Les mots de passe ne correspondent pas.');
        return;
      }
      handleUpdatePassword(password, function () {
        window.location.href = 'portail-dashboard.html';
      }, function (msg) {
        showAlert('view-new-password', 'error', translateError(msg));
      });
    });
  }
}

/* --- Error Translation --- */
function translateError(msg) {
  if (!msg) return 'Une erreur est survenue.';
  var lower = msg.toLowerCase();
  if (lower.indexOf('invalid login credentials') !== -1) return 'Email ou mot de passe incorrect.';
  if (lower.indexOf('email not confirmed') !== -1) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (lower.indexOf('user already registered') !== -1) return 'Un compte existe déjà avec cet email.';
  if (lower.indexOf('password') !== -1 && lower.indexOf('least') !== -1) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (lower.indexOf('rate limit') !== -1) return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
  return msg;
}

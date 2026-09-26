
(function () {
  const form = document.getElementById('contactWizardForm');
  if (!form) return;

  const panels = Array.from(document.querySelectorAll('.cw-step-panel'));
  const steps = Array.from(document.querySelectorAll('.cw-step'));
  const progressLine = document.getElementById('cwProgressLine');
  const nextBtn = document.getElementById('cwNextBtn');
  const backBtn = document.getElementById('cwBackBtn');
  const stepNote = document.getElementById('cwStepNote');
  const formError = document.getElementById('cwFormError');
  const deliveryStatus = document.getElementById('cwDeliveryStatus');
  const consentBox = document.getElementById('cwConsentBox');
  const consentPdpa = document.getElementById('consentPdpa');
  const captchaAnswer = document.getElementById('captchaAnswer');
  const captchaQuestion = document.getElementById('captchaQuestion');
  const captchaStatus = document.getElementById('captchaStatus');
  const captchaRefresh = document.getElementById('captchaRefresh');
  const successBox = document.getElementById('successBox');

  const firstname = document.getElementById('firstname');
  const lastname = document.getElementById('lastname');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const message = document.getElementById('message');

  const summary = {
    firstname: document.getElementById('summaryFirstname'),
    lastname: document.getElementById('summaryLastname'),
    email: document.getElementById('summaryEmail'),
    phone: document.getElementById('summaryPhone'),
    message: document.getElementById('summaryMessage')
  };
  const summaryRef = document.getElementById('summaryReference');

  const stepNotes = window.CW_STEP_NOTES || ['', '', ''];
  let current = 0;
  let captchaSolution = 0;
  let sending = false;

  function t() { return (typeof CONTACT_MSGS !== 'undefined' && CONTACT_MSGS) || {}; }

  function newCaptcha() {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    captchaSolution = a + b;
    captchaQuestion.textContent = a + ' + ' + b + ' =';
    captchaAnswer.value = '';
    captchaStatus.textContent = t().captcha_pending || '';
    captchaStatus.className = 'cw-captcha-status';
  }
  function captchaIsValid() {
    return captchaAnswer.value.trim() !== '' && parseInt(captchaAnswer.value, 10) === captchaSolution;
  }
  function setConsentVisual() {
    consentBox.classList.toggle('checked', consentPdpa.checked);
  }
  function fieldValid(field) {
    const input = field.querySelector('input, textarea');
    if (!input) return true;
    if (!input.hasAttribute('required')) return true;
    const valid = input.checkValidity() && input.value.trim() !== '';
    field.classList.toggle('invalid', !valid);
    return valid;
  }
  function validateStep() {
    formError.textContent = '';
    const fields = Array.from(panels[current].querySelectorAll('.cw-field'));
    const fieldsOk = fields.map(fieldValid).every(Boolean);
    if (!fieldsOk) {
      formError.textContent = t().cw_fields_required || '';
      return false;
    }
    if (current === 2) {
      if (!consentPdpa.checked) {
        formError.textContent = t().cw_consent_required || '';
        return false;
      }
      if (!captchaIsValid()) {
        captchaStatus.textContent = captchaAnswer.value ? (t().captcha_bad || '') : (t().captcha_pending || '');
        captchaStatus.className = 'cw-captcha-status ' + (captchaAnswer.value ? 'bad' : '');
        formError.textContent = t().cw_captcha_required || '';
        return false;
      }
    }
    return true;
  }
  function render() {
    panels.forEach((panel, i) => panel.classList.toggle('active', i === current));
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === current);
      s.classList.toggle('done', i < current);
    });
    progressLine.style.width = (current / 2) * 100 + '%';
    backBtn.hidden = current === 0;
    nextBtn.textContent = current === 2 ? (window.CW_SEND_LABEL || '') : (window.CW_NEXT_LABEL || '');
    stepNote.textContent = stepNotes[current] || '';
    const focusEl = panels[current].querySelector('input, textarea');
    if (focusEl) setTimeout(() => focusEl.focus(), 200);
  }

  function summaryValue(input) {
    const v = input && input.value.trim();
    return v ? v : (t().cw_not_provided || '—');
  }
  function populateSummary() {
    summary.firstname.textContent = summaryValue(firstname);
    summary.lastname.textContent = summaryValue(lastname);
    summary.email.textContent = summaryValue(email);
    summary.phone.textContent = summaryValue(phone);
    summary.message.textContent = summaryValue(message);
    const now = new Date();
    summaryRef.textContent = 'TF-' + now.getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
  }

  const WEB3FORMS_ACCESS_KEY = '136c04a7-2e63-4593-b901-e7a588def046';

  function submitToWeb3Forms() {
    if (sending) return;
    sending = true;
    nextBtn.disabled = true;
    backBtn.disabled = true;
    deliveryStatus.textContent = t().cw_sending || '';
    deliveryStatus.className = 'cw-delivery-status pending';

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: 'Nouvelle demande de contact — Terra & Form',
      name: firstname.value + ' ' + lastname.value,
      firstname: firstname.value,
      lastname: lastname.value,
      email: email.value,
      phone: phone.value,
      message: message.value
    };

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          deliveryStatus.textContent = '';
          deliveryStatus.className = 'cw-delivery-status';
          populateSummary();
          form.style.display = 'none';
          successBox.classList.add('show');
          successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Mark every step as completed once the submission actually succeeds,
          // so the "03 Projet" indicator turns green like the first two instead
          // of staying on its "current step" color.
          steps.forEach((s) => {
            s.classList.add('done');
            s.classList.remove('active');
          });
          progressLine.style.width = '100%';
        } else {
          throw new Error(data.message || 'submission failed');
        }
      })
      .catch((err) => {
        deliveryStatus.textContent = '';
        deliveryStatus.className = 'cw-delivery-status';
        formError.textContent = t().error_msg || '';
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.error('Terra & Form contact wizard error:', err);
      })
      .finally(() => {
        sending = false;
        nextBtn.disabled = false;
        backBtn.disabled = false;
      });
  }

  nextBtn.addEventListener('click', () => {
    if (!validateStep()) return;
    if (current < 2) {
      current += 1;
      render();
    } else {
      submitToWeb3Forms();
    }
  });
  backBtn.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      formError.textContent = '';
      render();
    }
  });
  form.addEventListener('input', () => {
    formError.textContent = '';
    const activeFields = Array.from(panels[current].querySelectorAll('.cw-field'));
    activeFields.forEach((field) => {
      const input = field.querySelector('input, textarea');
      if (input && input.value) fieldValid(field);
    });
    if (captchaAnswer.value && current === 2) {
      const ok = captchaIsValid();
      captchaStatus.textContent = ok ? (t().captcha_ok || '') : (t().captcha_bad || '');
      captchaStatus.className = 'cw-captcha-status ' + (ok ? 'ok' : 'bad');
    }
  });
  consentBox.addEventListener('click', (e) => {
    // Clicks on the checkbox itself, on the <label> (native label-for already
    // toggles the checkbox in that case) or on the policy link must not be
    // handled here, or the checkbox would flip twice and appear stuck.
    if (e.target.closest('a') || e.target === consentPdpa || e.target.closest('label')) return;
    consentPdpa.checked = !consentPdpa.checked;
    consentPdpa.dispatchEvent(new Event('change', { bubbles: true }));
  });
  consentPdpa.addEventListener('change', setConsentVisual);
  captchaRefresh.addEventListener('click', newCaptcha);

  const restartBtn = document.getElementById('cwRestart');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      form.reset();
      form.style.display = '';
      successBox.classList.remove('show');
      document.querySelectorAll('.cw-field').forEach((f) => f.classList.remove('invalid'));
      consentPdpa.checked = false;
      setConsentVisual();
      current = 0;
      newCaptcha();
      render();
      window.scrollTo({ top: form.closest('.contact-wizard').offsetTop - 20, behavior: 'smooth' });
    });
  }

  window.__langChangeCallbacks = window.__langChangeCallbacks || [];
  window.__langChangeCallbacks.push(() => {
    captchaStatus.textContent = t().captcha_pending || '';
  });

  newCaptcha();
  setConsentVisual();
  render();
})();

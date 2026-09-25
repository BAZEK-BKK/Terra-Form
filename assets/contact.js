
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const consentPdpa = document.getElementById('consentPdpa');
  const captchaAnswer = document.getElementById('captchaAnswer');
  const captchaQuestion = document.getElementById('captchaQuestion');
  const captchaStatus = document.getElementById('captchaStatus');
  const captchaRefresh = document.getElementById('captchaRefresh');
  const successBox = document.getElementById('successBox');
  const validationMsg = document.getElementById('validationMsg');
  const requiredFields = ['lastname', 'firstname', 'phone', 'email'].map(id => document.getElementById(id));
  const lastname = document.getElementById('lastname');
  const firstname = document.getElementById('firstname');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  const message = document.getElementById('message');

  let captchaSolution = 0;

  function currentDict(){ return CONTACT_MSGS; }

  function newCaptcha(){
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    captchaSolution = a + b;
    captchaQuestion.textContent = a + ' + ' + b + ' =';
    captchaAnswer.value = '';
    captchaStatus.textContent = currentDict().captcha_pending;
    captchaStatus.className = 'captcha-status pending';
    evaluateForm();
  }

  function captchaIsValid(){ return parseInt(captchaAnswer.value, 10) === captchaSolution; }

  function evaluateForm(){
    const fieldsOk = requiredFields.every(f => f.value.trim() !== '' && f.checkValidity());
    const consentOk = consentPdpa.checked;
    const captchaOk = captchaIsValid();
    if (captchaAnswer.value !== '') {
      captchaStatus.textContent = captchaOk ? currentDict().captcha_ok : currentDict().captcha_bad;
      captchaStatus.className = 'captcha-status ' + (captchaOk ? 'ok' : 'pending');
    }
    const isValid = fieldsOk && consentOk && captchaOk;
    submitBtn.classList.toggle('is-disabled', !isValid);
    submitBtn.setAttribute('aria-disabled', !isValid);

    // Update aria-invalid for fields
    requiredFields.forEach(f => {
      const isFieldValid = f.value.trim() !== '' && f.checkValidity();
      f.setAttribute('aria-invalid', !isFieldValid);
    });
    consentPdpa.setAttribute('aria-invalid', !consentOk);
    captchaAnswer.setAttribute('aria-invalid', captchaAnswer.value !== '' && !captchaOk);

    if (isValid) validationMsg.style.display = 'none';
    return isValid;
  }

  requiredFields.forEach(f => f.addEventListener('input', evaluateForm));
  consentPdpa.addEventListener('change', evaluateForm);
  captchaAnswer.addEventListener('input', evaluateForm);
  captchaRefresh.addEventListener('click', newCaptcha);
  window.__langChangeCallbacks = window.__langChangeCallbacks || [];
  window.__langChangeCallbacks.push(function(lang){ evaluateForm(); });

  const WEB3FORMS_ACCESS_KEY = '136c04a7-2e63-4593-b901-e7a588def046';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!evaluateForm()) {
      validationMsg.textContent = currentDict().validation_msg;
      validationMsg.style.display = 'block';
      submitBtn.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    submitBtn.classList.add('is-disabled');
    console.log('Terra & Form contact form — validation OK, envoi en cours...');

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: 'Nouvelle demande de contact \u2014 Terra & Form',
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
      .then(res => res.json())
      .then(data => {
        console.log('Terra & Form contact form — réponse Web3Forms:', data);
        if (data.success) {
          form.style.display = 'none';
          successBox.classList.add('show');
          requestAnimationFrame(() => successBox.classList.add('visible'));
          successBox.scrollIntoView({behavior:'smooth', block:'center'});
        } else {
          throw new Error(data.message || 'submission failed');
        }
      })
      .catch((err) => {
        submitBtn.classList.remove('is-disabled');
        validationMsg.textContent = currentDict().error_msg;
        validationMsg.style.display = 'block';
        validationMsg.scrollIntoView({behavior:'smooth', block:'center'});
        console.error('Terra & Form contact form error:', err);
      });
  });

  newCaptcha();

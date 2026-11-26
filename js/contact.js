/* Static email composition only. No form POST, browser storage or enquiry data in analytics. */
(function () {
  'use strict';
  var form = document.getElementById('ExteroContactForm');
  if (!form) return;
  var industry = document.getElementById('xec-industry');
  var software = document.getElementById('xec-software');
  var message = document.getElementById('xec-message');
  var status = document.getElementById('xec-draft-status');
  var output = document.getElementById('xec-draft-copy');
  var params = new URLSearchParams(location.search);
  var selected = params.get('industry');
  if (!industry.value && Array.from(industry.options).some(function (o) { return o.value === selected; })) industry.value = selected;
  if (params.get('enquiry') === 'software') {
    software.required = true;
    document.getElementById('xec-software-note').textContent = 'Required for a compatibility check';
    document.getElementById('xec-context').textContent = 'Add your software name and contact details. We have prepared the compatibility enquiry for you.';
    var previous = '';
    function update() {
      var name = industry.value ? industry.options[industry.selectedIndex].text : 'our industry';
      var next = 'Hello Extero team,\n\nWe work in ' + name + ' and use ' + (software.value.trim() || '[software name]') + '. Can you confirm whether Extero can connect to this software and what setup would be needed?\n\nThank you.';
      if (!message.value || message.value === previous) message.value = next;
      previous = next;
    }
    industry.addEventListener('change', update);
    software.addEventListener('input', update);
    update();
  }
  function value(name) { return form.elements.namedItem('contact[' + name + ']').value.trim().replace(/[\r\n]+/g, ' '); }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var subject = params.get('enquiry') === 'software' ? 'Extero software compatibility enquiry' : 'Extero enquiry';
    var body = message.value.trim() + '\n\nContact details\nName: ' + value('name') + '\nEmail: ' + value('email');
    if (value('organization')) body += '\nCompany: ' + value('organization');
    if (value('phone')) body += '\nPhone: ' + value('phone');
    if (industry.value) body += '\nIndustry: ' + industry.options[industry.selectedIndex].text;
    if (software.value.trim()) body += '\nSoftware: ' + value('software');
    output.value = 'To: team@nx.vet\nSubject: ' + subject + '\n\n' + body;
    document.getElementById('xec-draft-fallback').hidden = false;
    var href = 'mailto:team@nx.vet?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.dispatchEvent(new CustomEvent('nxvet:analytics', { detail: { event: 'contact_email_draft', industry: industry.value || 'unspecified' } }));
    // Long mailto URLs may be truncated by email clients. The copy fallback preserves the full message.
    if (href.length > 2000) {
      status.textContent = 'Your message is ready. It is too long for a reliable email link, so copy the full text below and send it to team@nx.vet.';
      output.focus(); output.select();
      return;
    }
    status.textContent = 'Your draft is ready. Send it from your email app, or copy the message below. Nothing has been sent by this page.';
    window.location.assign(href);
  });
  document.getElementById('xec-copy-email').addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Email text copied. Paste it into your email app and send it to team@nx.vet.';
    } catch (_) {
      output.focus(); output.select();
      status.textContent = 'Select and copy the prepared text, then paste it into your email app.';
    }
  });
  document.getElementById('xec-open-email').disabled = false;
})();

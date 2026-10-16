(function(){
  var BOOKING_URL = 'https://cal.com/carlcahill/creative-in-the-loop';
  var CALC_ID = 'citl-cost-calculator';

  function calcRoot(){
    return document.getElementById(CALC_ID);
  }

  function getFormspreeEndpoint(){
    var m = document.querySelector('meta[name="citl-formspree-id"]');
    if (!m) return null;
    var id = (m.getAttribute('content') || '').trim();
    if (!id) return null;
    return 'https://formspree.io/f/' + encodeURIComponent(id);
  }

  function selectLabel(selId){
    var s = document.getElementById(selId);
    if (!s || s.selectedIndex < 0) return '';
    var opt = s.options[s.selectedIndex];
    return opt ? (opt.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function buildSummaryMessage(d){
    return [
      'Creative in the Loop — value calculator',
      '',
      'Contact',
      'Name: ' + d.name,
      'Email: ' + d.email,
      'Company: ' + (d.company || '\u2014'),
      '',
      'Inputs',
      'Team size (AI users): ' + d.teamSize,
      'Hours/week on fixes / re-prompting: ' + d.hoursWasted,
      'Team type: ' + d.teamTypeLabel,
      'Day rate band: ' + d.dayRateLabel,
      'Output quality: ' + d.qualityLabel,
      '',
      'Estimated costs (\u00A3)',
      'Weekly rework hours: ' + d.weeklyHoursTotal,
      'Weekly rework cost: ' + Math.round(d.weeklyCost),
      'Annual rework: ' + Math.round(d.annualRework),
      'Substandard output (est.): ' + Math.round(d.outputCost),
      'Total annual cost (model): ' + Math.round(d.totalAnnualCost),
      '',
      'Creative in the Loop (illustrative)',
      'Setup (phases 1\u20132): ' + d.setupFee,
      'Flexi-Design / yr: ' + d.flexiPack,
      'Total year one: ' + d.totalInvest,
      'Modeled saving year 1: ' + Math.round(d.saving),
      '',
      'Submitted (UTC): ' + d.submittedAt,
      'Page: ' + (typeof location !== 'undefined' ? location.href : '')
    ].join('\n');
  }

  function submitLead(d){
    var url = getFormspreeEndpoint();
    if (!url){
      return Promise.resolve({ skipped: true });
    }

    var bot = document.getElementById('cc-botcheck');
    if (bot && bot.value){
      return Promise.reject(new Error('spam'));
    }

    var body = {
      _replyto: d.email,
      _subject: '[CITL Calculator] ' + d.name,
      name: d.name,
      email: d.email,
      company: d.company || '',
      message: buildSummaryMessage(d),
      team_size: String(d.teamSize),
      hours_wasted_week: String(d.hoursWasted),
      team_type: d.teamType,
      day_rate_band: String(d.dayRate),
      output_quality: d.outputQuality,
      weekly_rework_hours: String(d.weeklyHoursTotal),
      weekly_rework_cost_gbp: String(Math.round(d.weeklyCost)),
      annual_rework_gbp: String(Math.round(d.annualRework)),
      output_cost_gbp: String(Math.round(d.outputCost)),
      total_annual_cost_gbp: String(Math.round(d.totalAnnualCost)),
      citl_setup_gbp: String(d.setupFee),
      citl_flexi_yr_gbp: String(d.flexiPack),
      citl_total_y1_gbp: String(d.totalInvest),
      saving_y1_gbp: String(Math.round(d.saving)),
      form_source: 'citl-calculator'
    };

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function(res){
      if (!res.ok){
        return res.json().catch(function(){
          throw new Error('Could not send submission');
        }).then(function(err){
          var msg = (err && err.error) || 'Could not send submission';
          throw new Error(typeof msg === 'string' ? msg : 'Could not send submission');
        });
      }
      return res.json();
    });
  }

  function setSubmitNotice(text, kind){
    var el = document.getElementById('cc-submit-notice');
    if (!el) return;
    if (!text){
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('is-success', 'is-error', 'is-info');
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-success', kind === 'success');
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-info', kind === 'info');
  }

  function setSubmitButton(busy){
    var btn = document.getElementById('cc-step3-submit');
    if (!btn) return;
    if (busy){
      btn.disabled = true;
      if (!btn.dataset.labelDefault) btn.dataset.labelDefault = btn.textContent;
      btn.textContent = 'Sending\u2026';
    } else {
      btn.disabled = false;
      if (btn.dataset.labelDefault) btn.textContent = btn.dataset.labelDefault;
    }
  }

  function computeData(name, email, company){
    var teamSize = parseInt(document.getElementById('teamSize').value, 10);
    var hoursWasted = parseInt(document.getElementById('hoursWasted').value, 10);
    var dayRate = parseInt(document.getElementById('dayRate').value, 10);
    var quality = document.getElementById('outputQuality').value;
    var teamType = document.getElementById('teamType').value;

    var hourlyRate = dayRate / 7.5;

    var weeklyHoursTotal = hoursWasted * teamSize;
    var weeklyCost = weeklyHoursTotal * hourlyRate;
    var annualRework = weeklyCost * 52;

    var qualityMultipliers = { poor: 1.4, mixed: 1.2, okay: 1.0, good: 0.6 };
    var qMult = qualityMultipliers[quality] || 1.0;
    var outputCost = annualRework * qMult * 0.5;

    var totalAnnualCost = annualRework + outputCost;

    var setupFee = teamSize <= 3 ? 4000 : teamSize <= 8 ? 5000 : 6000;
    var flexiPack = teamSize <= 3 ? 3420 : teamSize <= 8 ? 4860 : 6120;
    var totalInvest = setupFee + flexiPack;
    var saving = totalAnnualCost - totalInvest;

    return {
      name: name,
      email: email,
      company: company,
      teamSize: teamSize,
      hoursWasted: hoursWasted,
      dayRate: dayRate,
      outputQuality: quality,
      teamType: teamType,
      teamTypeLabel: selectLabel('teamType'),
      dayRateLabel: selectLabel('dayRate'),
      qualityLabel: selectLabel('outputQuality'),
      weeklyHoursTotal: weeklyHoursTotal,
      weeklyCost: weeklyCost,
      annualRework: annualRework,
      outputCost: outputCost,
      totalAnnualCost: totalAnnualCost,
      setupFee: setupFee,
      flexiPack: flexiPack,
      totalInvest: totalInvest,
      saving: saving,
      submittedAt: new Date().toISOString()
    };
  }

  function fmt(n){
    return '\u00A3' + Math.round(n).toLocaleString('en-GB');
  }

  function renderResults(d){
    var root = calcRoot();
    if (!root) return;

    document.getElementById('annualWaste').textContent = fmt(d.totalAnnualCost);
    document.getElementById('r-weeklyHours').textContent = d.weeklyHoursTotal + ' hrs';
    document.getElementById('r-weeklyCost').textContent = fmt(d.weeklyCost) + ' / wk';
    document.getElementById('r-annualRework').textContent = fmt(d.annualRework);
    document.getElementById('r-outputCost').textContent = fmt(d.outputCost);

    document.getElementById('vs-current').textContent = fmt(d.totalAnnualCost) + ' / yr';
    document.getElementById('vs-setup').textContent = fmt(d.setupFee) + ' (one-off)';
    document.getElementById('vs-flexi').textContent = fmt(d.flexiPack) + ' / yr';
    document.getElementById('vs-total').textContent = fmt(d.totalInvest);
    document.getElementById('vs-saving').textContent = d.saving > 0 ? fmt(d.saving) : '\u2014';

    var firstName = d.name.split(' ')[0];
    document.getElementById('resultSub').textContent =
      'Based on your team of ' + d.teamSize + ', ' + firstName + '. This is what inconsistency is costing you right now.';

    var rec = '';
    if (d.saving > 10000){
      rec = 'Based on your numbers, <strong>Creative in the Loop would more than pay for itself in year one</strong>. The gap between what you\'re losing and what the service costs is significant. A short call would tell us quickly whether it\'s the right fit.';
    } else if (d.saving > 0){
      rec = 'Your numbers suggest <strong>a positive return in year one</strong>, even before accounting for the longer-term value of a properly configured creative engine. Worth a conversation to explore the fit.';
    } else {
      rec = 'Your team is smaller, so the numbers are tighter. But <strong>the qualitative case is still strong</strong> \u2014 consistency, brand quality, and time saved compound over time. Let\'s talk and find out if the timing is right.';
    }

    if (d.teamType === 'agency'){
      rec += ' For an agency, the real upside is also in what you can offer clients \u2014 a structured AI creative service is a genuine differentiator.';
    }

    document.getElementById('recommendationText').innerHTML = rec;

    root.querySelectorAll('.cc-step').forEach(function(s){
      s.classList.remove('is-active');
    });
    document.getElementById('stepResults').classList.add('is-active');
    document.getElementById('progressBar').style.width = '100%';

    var scrollOpts = { block: 'start' };
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      scrollOpts.behavior = 'smooth';
    }
    document.getElementById('stepResults').scrollIntoView(scrollOpts);
  }

  function goStep(n){
    var root = calcRoot();
    if (!root) return;

    if (n === 2){
      var tt = document.getElementById('teamType').value;
      if (!tt){ markError('teamType'); return; }
      clearError('teamType');
    }
    if (n === 3){
      var dr = document.getElementById('dayRate').value;
      var oq = document.getElementById('outputQuality').value;
      if (!dr){ markError('dayRate'); return; }
      if (!oq){ markError('outputQuality'); return; }
      clearError('dayRate');
      clearError('outputQuality');
    }

    root.querySelectorAll('.cc-step').forEach(function(s){
      s.classList.remove('is-active');
    });
    document.getElementById('step' + n).classList.add('is-active');

    var bars = { 1: 33, 2: 66, 3: 90 };
    document.getElementById('progressBar').style.width = (bars[n] || 100) + '%';
  }

  function markError(id){
    var el = document.getElementById(id);
    if (el){
      var field = el.closest('.cc-field');
      if (field) field.classList.add('has-error');
    }
  }

  function clearError(id){
    var el = document.getElementById(id);
    if (el){
      var field = el.closest('.cc-field');
      if (field) field.classList.remove('has-error');
    }
  }

  function showResults(){
    var name = document.getElementById('userName').value.trim();
    var email = document.getElementById('userEmail').value.trim();
    var company = document.getElementById('userCompany').value.trim();
    var valid = true;

    var nameField = document.getElementById('field-name');
    if (!name){
      nameField.classList.add('has-error');
      valid = false;
    } else {
      nameField.classList.remove('has-error');
    }

    var emailField = document.getElementById('field-email');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)){
      emailField.classList.add('has-error');
      valid = false;
    } else {
      emailField.classList.remove('has-error');
    }

    if (!valid) return;

    var data = computeData(name, email, company);
    var hasEndpoint = !!getFormspreeEndpoint();

    setSubmitNotice('', '');
    setSubmitButton(true);

    var done = function(){
      setSubmitButton(false);
      renderResults(data);
    };

    if (!hasEndpoint){
      done();
      setSubmitNotice(
        'Formspree isn\u2019t configured yet \u2014 add your form id in the citl-formspree-id meta tag. Results are shown below.',
        'info'
      );
      return;
    }

    submitLead(data).then(function(){
      done();
      setSubmitNotice(
        'Thanks \u2014 we\u2019ve received your submission and our team has been notified. Your breakdown is below.',
        'success'
      );
    }).catch(function(err){
      if (err && err.message === 'spam'){
        setSubmitButton(false);
        return;
      }
      done();
      setSubmitNotice(
        'We couldn\u2019t reach the form service. Your figures are still shown below \u2014 or email hello@salo.uk.',
        'error'
      );
    });
  }

  function restart(){
    var root = calcRoot();
    if (!root) return;

    root.querySelectorAll('.cc-step').forEach(function(s){
      s.classList.remove('is-active');
    });
    document.getElementById('step1').classList.add('is-active');
    document.getElementById('progressBar').style.width = '33%';
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userCompany').value = '';
    var bot = document.getElementById('cc-botcheck');
    if (bot) bot.value = '';
    root.querySelectorAll('.cc-field.has-error').forEach(function(f){
      f.classList.remove('has-error');
    });

    setSubmitNotice('', '');
    setSubmitButton(false);

    var scrollOpts = { block: 'start' };
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      scrollOpts.behavior = 'smooth';
    }
    root.scrollIntoView(scrollOpts);
  }

  function init(){
    var root = calcRoot();
    if (!root) return;

    var teamSize = document.getElementById('teamSize');
    var hoursWasted = document.getElementById('hoursWasted');
    if (teamSize){
      teamSize.addEventListener('input', function(){
        document.getElementById('teamVal').textContent = this.value;
        this.setAttribute('aria-valuenow', this.value);
      });
    }
    if (hoursWasted){
      hoursWasted.addEventListener('input', function(){
        document.getElementById('hoursVal').textContent = this.value;
        this.setAttribute('aria-valuenow', this.value);
      });
    }

    var step1next = document.getElementById('cc-step1-next');
    if (step1next) step1next.addEventListener('click', function(){ goStep(2); });

    var step2back = document.getElementById('cc-step2-back');
    var step2next = document.getElementById('cc-step2-next');
    if (step2back) step2back.addEventListener('click', function(){ goStep(1); });
    if (step2next) step2next.addEventListener('click', function(){ goStep(3); });

    var step3back = document.getElementById('cc-step3-back');
    var step3submit = document.getElementById('cc-step3-submit');
    if (step3back) step3back.addEventListener('click', function(){ goStep(2); });
    if (step3submit) step3submit.addEventListener('click', showResults);

    var resultsBook = document.getElementById('cc-results-book');
    var resultsRestart = document.getElementById('cc-results-restart');
    if (resultsBook){
      resultsBook.addEventListener('click', function(){
        window.open(BOOKING_URL, '_blank', 'noopener,noreferrer');
      });
    }
    if (resultsRestart) resultsRestart.addEventListener('click', restart);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

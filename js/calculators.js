// Calculator Module - Respiratory Care Calculations
if (typeof window.calculatorModule === 'undefined') {
    const calculatorModule = (function() {
        
        // Validation utilities
        const validators = {
            required: (value, fieldName) => {
                if (!value || value.trim() === '') {
                    return `${fieldName} is required`;
                }
                return null;
            },
            
            number: (value, fieldName) => {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    return `${fieldName} must be a valid number`;
                }
                return null;
            },
            
            positive: (value, fieldName) => {
                const num = parseFloat(value);
                if (num <= 0) {
                    return `${fieldName} must be positive`;
                }
                return null;
            },
            
            range: (value, min, max, fieldName) => {
                const num = parseFloat(value);
                if (num < min || num > max) {
                    return `${fieldName} must be between ${min} and ${max}`;
                }
                return null;
            },
            
            height: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'Height must be a valid number';
                if (num <= 0) return 'Height must be positive';
                if (num < 50 || num > 300) return 'Height must be between 50 and 300 cm';
                return null;
            },
            
            pao2: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'PaO₂ must be a valid number';
                if (num < 0 || num > 800) return 'PaO₂ must be between 0 and 800 mmHg';
                return null;
            },
            
            fio2: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'FiO₂ must be a valid number';
                if (num < 0.21 || num > 1) return 'FiO₂ must be between 0.21 and 1.0';
                return null;
            },
            
            spo2: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'SpO₂ must be a valid number';
                if (num < 70 || num > 100) return 'SpO₂ must be between 70 and 100%';
                return null;
            },
            
            respRate: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'Respiratory rate must be a valid number';
                if (num < 1 || num > 80) return 'Respiratory rate must be between 1 and 80 breaths/min';
                return null;
            },
            
            pressure: (value, fieldName) => {
                const num = parseFloat(value);
                if (isNaN(num)) return `${fieldName} must be a valid number`;
                if (num < 0 || num > 100) return `${fieldName} must be between 0 and 100 cmH₂O`;
                return null;
            },
            
            flow: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'Flow must be a valid number';
                if (num <= 0 || num > 200) return 'Flow must be between 0 and 200 L/sec';
                return null;
            },
            
            volume: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'Volume must be a valid number';
                if (num <= 0 || num > 2000) return 'Volume must be between 0 and 2000 mL';
                return null;
            },
            
            minuteVentilation: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return 'Minute ventilation must be a valid number';
                if (num <= 0 || num > 50) return 'Minute ventilation must be between 0 and 50 L/min';
                return null;
            }
        };
        
        // Show validation error
        function showValidationError(inputId, message) {
            const input = document.getElementById(inputId);
            const errorDiv = document.getElementById(inputId + '-error') || createErrorDiv(inputId);
            
            if (input) {
                input.classList.add('error');
                input.style.borderColor = '#ef4444';
            }
            
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
        }
        
        // Clear validation error
        function clearValidationError(inputId) {
            const input = document.getElementById(inputId);
            const errorDiv = document.getElementById(inputId + '-error');
            
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
            }
            
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }
        
        // Create error div if it doesn't exist
        function createErrorDiv(inputId) {
            const input = document.getElementById(inputId);
            if (!input) return null;
            
            const errorDiv = document.createElement('div');
            errorDiv.id = inputId + '-error';
            errorDiv.className = 'validation-error';
            errorDiv.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; display: none;';
            
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
            return errorDiv;
        }
        
        // Real-time validation
        function setupRealTimeValidation() {
            const inputs = document.querySelectorAll('.form-input');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    clearValidationError(this.id);
                });
                
                input.addEventListener('blur', function() {
                    validateField(this.id, this.value);
                });
            });
        }
        
        // Validate individual field
        function validateField(fieldId, value) {
            let error = null;
            
            switch (fieldId) {
                case 'height':
                    error = validators.height(value);
                    break;
                case 'pao2':
                    error = validators.pao2(value);
                    break;
                case 'fio2':
                case 'rox-fio2':
                case 'current-fio2':
                    error = validators.fio2(value);
                    break;
                case 'spo2':
                    error = validators.spo2(value);
                    break;
                case 'resp-rate':
                    error = validators.respRate(value);
                    break;
                case 'plateau-pressure':
                case 'peep':
                case 'pip':
                case 'plateau':
                case 'plateau-pressure-c':
                case 'peep-c':
                    error = validators.pressure(value, fieldId.replace('-', ' '));
                    break;
                case 'flow':
                    error = validators.flow(value);
                    break;
                case 'tidal-volume':
                    error = validators.volume(value);
                    break;
                case 'current-mv':
                    error = validators.minuteVentilation(value);
                    break;
                case 'current-paco2':
                case 'target-paco2':
                    error = validators.range(value, 20, 100, 'PaCO₂');
                    break;
                case 'current-pao2':
                case 'target-pao2':
                    error = validators.pao2(value);
                    break;
            }
            
            if (error) {
                showValidationError(fieldId, error);
                return false;
            }
            
            return true;
        }
        
        // Calculator functions with enhanced validation
        function calculateIBW() {
            const height = document.getElementById('height').value;
            const genderElement = document.querySelector('input[name="gender"]:checked');
            
            // Clear previous errors
            clearValidationError('height');
            
            // Validate inputs
            const heightError = validators.height(height);
            if (heightError) {
                showValidationError('height', heightError);
                return;
            }
            
            if (!genderElement) {
                alert('Please select a gender.');
                return;
            }
            
            const gender = genderElement.value;
            const heightNum = parseFloat(height);
            
            let ibw;
            const heightInInches = heightNum / 2.54;
            
            if (gender === 'male') {
                ibw = 50 + 2.3 * (heightInInches - 60);
            } else {
                ibw = 45.5 + 2.3 * (heightInInches - 60);
            }
            
            // Round to 1 decimal place
            ibw = Math.round(ibw * 10) / 10;
            
            // Calculate tidal volumes
            const vtHealthyLow = Math.round(ibw * 6);
            const vtHealthyHigh = Math.round(ibw * 8);
            const vtArdsLow = Math.round(ibw * 4);
            const vtArdsHigh = Math.round(ibw * 6);
            const vtCOPDLow = Math.round(ibw * 8);
            const vtCOPDHigh = Math.round(ibw * 10);
            const vtSCILow = Math.round(ibw * 10);
            const vtSCIHigh = Math.round(ibw * 15);
            
            document.getElementById('ibw-result').textContent = ibw + ' kg';
            document.getElementById('vt-healthy').textContent = vtHealthyLow + ' - ' + vtHealthyHigh + ' ml';
            document.getElementById('vt-ards').textContent = vtArdsLow + ' - ' + vtArdsHigh + ' ml';
            document.getElementById('vt-copd').textContent = vtCOPDLow + ' - ' + vtCOPDHigh + ' ml';
            document.getElementById('vt-sci').textContent = vtSCILow + ' - ' + vtSCIHigh + ' ml';
        }
        
        function calculatePF() {
            const pao2 = document.getElementById('pao2').value;
            const fio2 = document.getElementById('fio2').value;
            
            // Clear previous errors
            clearValidationError('pao2');
            clearValidationError('fio2');
            
            // Validate inputs
            const pao2Error = validators.pao2(pao2);
            const fio2Error = validators.fio2(fio2);
            
            if (pao2Error) {
                showValidationError('pao2', pao2Error);
                return;
            }
            
            if (fio2Error) {
                showValidationError('fio2', fio2Error);
                return;
            }
            
            const pao2Num = parseFloat(pao2);
            const fio2Num = parseFloat(fio2);
            
            const pfRatio = pao2Num / fio2Num;
            const roundedRatio = Math.round(pfRatio);
            
            document.getElementById('pf-result').textContent = roundedRatio;
            
            // Interpretation
            let interpretation = '';
            if (pfRatio >= 400) {
                interpretation = '<span style="color: #22c55e;">Normal oxygenation</span>';
            } else if (pfRatio >= 300) {
                interpretation = '<span style="color: #f59e0b;">Mild ARDS</span>';
            } else if (pfRatio >= 200) {
                interpretation = '<span style="color: #f97316;">Moderate ARDS</span>';
            } else {
                interpretation = '<span style="color: #ef4444;">Severe ARDS</span>';
            }
            
            document.getElementById('pf-interpretation').innerHTML = interpretation;
        }
        
        function calculateROX() {
            const spo2 = document.getElementById('spo2').value;
            const fio2 = document.getElementById('rox-fio2').value;
            const respRate = document.getElementById('resp-rate').value;
            
            // Clear previous errors
            clearValidationError('spo2');
            clearValidationError('rox-fio2');
            clearValidationError('resp-rate');
            
            // Validate inputs
            const spo2Error = validators.spo2(spo2);
            const fio2Error = validators.fio2(fio2);
            const respRateError = validators.respRate(respRate);
            
            if (spo2Error) {
                showValidationError('spo2', spo2Error);
                return;
            }
            
            if (fio2Error) {
                showValidationError('rox-fio2', fio2Error);
                return;
            }
            
            if (respRateError) {
                showValidationError('resp-rate', respRateError);
                return;
            }
            
            const spo2Num = parseFloat(spo2);
            const fio2Num = parseFloat(fio2);
            const respRateNum = parseFloat(respRate);
            
            const roxIndex = (spo2Num / fio2Num) / respRateNum;
            const roundedRox = Math.round(roxIndex * 100) / 100;
            
            document.getElementById('rox-result').textContent = roundedRox;
            
            // Interpretation
            let interpretation = '';
            if (roxIndex >= 4.88) {
                interpretation = '<span style="color: #22c55e;">High probability of HFNC success</span>';
            } else if (roxIndex >= 3.85) {
                interpretation = '<span style="color: #f59e0b;">Moderate probability of HFNC success</span>';
            } else {
                interpretation = '<span style="color: #ef4444;">High probability of HFNC failure</span>';
            }
            
            document.getElementById('rox-interpretation').innerHTML = interpretation;
        }
        
        function calculateDrivingPressure() {
            const plateauPressure = parseFloat(document.getElementById('plateau-pressure').value);
            const peep = parseFloat(document.getElementById('peep').value);
            
            if (!plateauPressure || !peep) {
                alert('Please enter valid plateau pressure and PEEP values.');
                return;
            }
            
            const drivingPressure = plateauPressure - peep;
            const roundedPressure = Math.round(drivingPressure * 10) / 10;
            
            document.getElementById('driving-result').textContent = roundedPressure + ' cmH₂O';
            
            // Interpretation
            let interpretation = '';
            if (drivingPressure <= 15) {
                interpretation = '<span style="color: #22c55e;">Normal driving pressure</span>';
            } else if (drivingPressure <= 20) {
                interpretation = '<span style="color: #f59e0b;">Elevated driving pressure</span>';
            } else {
                interpretation = '<span style="color: #ef4444;">High driving pressure - consider lung protective ventilation</span>';
            }
            
            document.getElementById('driving-interpretation').innerHTML = interpretation;
        }
        
        function calculateAirwayResistance() {
            const pip = parseFloat(document.getElementById('pip').value);
            const plateau = parseFloat(document.getElementById('plateau').value);
            const flow = parseFloat(document.getElementById('flow').value);
            
            if (!pip || !plateau || !flow) {
                alert('Please enter all required values.');
                return;
            }
            
            if (flow <= 0) {
                alert('Flow must be greater than 0.');
                return;
            }
            
            const resistance = (pip - plateau) / flow;
            const roundedResistance = Math.round(resistance * 100) / 100;
            
            document.getElementById('airway-result').textContent = roundedResistance + ' cmH₂O/L/sec';
            
            // Interpretation
            let interpretation = '';
            if (resistance <= 5) {
                interpretation = '<span style="color: #22c55e;">Normal airway resistance</span>';
            } else if (resistance <= 10) {
                interpretation = '<span style="color: #f59e0b;">Mildly elevated resistance</span>';
            } else if (resistance <= 20) {
                interpretation = '<span style="color: #f97316;">Moderately elevated resistance</span>';
            } else {
                interpretation = '<span style="color: #ef4444;">Severely elevated resistance</span>';
            }
            
            document.getElementById('airway-interpretation').innerHTML = interpretation;
        }
        
        function calculateCompliance() {
            const tidalVolume = parseFloat(document.getElementById('tidal-volume').value);
            const plateauPressure = parseFloat(document.getElementById('plateau-pressure-c').value);
            const peep = parseFloat(document.getElementById('peep-c').value);
            
            if (!tidalVolume || !plateauPressure || !peep) {
                alert('Please enter all required values.');
                return;
            }
            
            const compliance = tidalVolume / (plateauPressure - peep);
            const roundedCompliance = Math.round(compliance * 10) / 10;
            
            document.getElementById('compliance-result').textContent = roundedCompliance + ' ml/cmH₂O';
            
            // Interpretation
            let interpretation = '';
            if (compliance >= 50) {
                interpretation = '<span style="color: #22c55e;">Normal compliance</span>';
            } else if (compliance >= 30) {
                interpretation = '<span style="color: #f59e0b;">Mildly reduced compliance</span>';
            } else if (compliance >= 20) {
                interpretation = '<span style="color: #f97316;">Moderately reduced compliance</span>';
            } else {
                interpretation = '<span style="color: #ef4444;">Severely reduced compliance</span>';
            }
            
            document.getElementById('compliance-interpretation').innerHTML = interpretation;
        }
        
        function calculateMV() {
            const currentMV = parseFloat(document.getElementById('current-mv').value);
            const currentPaCO2 = parseFloat(document.getElementById('current-paco2').value);
            const targetPaCO2 = parseFloat(document.getElementById('target-paco2').value);
            
            if (!currentMV || !currentPaCO2 || !targetPaCO2) {
                alert('Please enter all required values.');
                return;
            }
            
            if (targetPaCO2 <= 0) {
                alert('Target PaCO₂ must be greater than 0.');
                return;
            }
            
            const targetMV = (currentMV * currentPaCO2) / targetPaCO2;
            const roundedTargetMV = Math.round(targetMV * 10) / 10;
            
            document.getElementById('mv-result').textContent = roundedTargetMV + ' L/min';
            
            // Interpretation
            let interpretation = '';
            const change = targetMV - currentMV;
            if (Math.abs(change) < 0.5) {
                interpretation = '<span style="color: #22c55e;">Minimal change needed</span>';
            } else if (change > 0) {
                interpretation = `<span style="color: #f59e0b;">Increase minute ventilation by ${Math.round(change * 10) / 10} L/min</span>`;
            } else {
                interpretation = `<span style="color: #f97316;">Decrease minute ventilation by ${Math.round(Math.abs(change) * 10) / 10} L/min</span>`;
            }
            
            document.getElementById('mv-interpretation').innerHTML = interpretation;
        }
        
        function calculateFiO2() {
            const currentPaO2 = parseFloat(document.getElementById('current-pao2').value);
            const currentFiO2 = parseFloat(document.getElementById('current-fio2').value);
            const targetPaO2 = parseFloat(document.getElementById('target-pao2').value);
            
            if (!currentPaO2 || !currentFiO2 || !targetPaO2) {
                alert('Please enter all required values.');
                return;
            }
            
            if (currentFiO2 < 0.21 || currentFiO2 > 1) {
                alert('Current FiO₂ must be between 0.21 and 1.0.');
                return;
            }
            
            const targetFiO2 = (currentFiO2 * targetPaO2) / currentPaO2;
            const roundedTargetFiO2 = Math.round(targetFiO2 * 100) / 100;
            
            // Ensure FiO2 is within valid range
            const finalFiO2 = Math.max(0.21, Math.min(1.0, roundedTargetFiO2));
            
            document.getElementById('fio2-result').textContent = (finalFiO2 * 100) + '%';
            
            // Interpretation
            let interpretation = '';
            const change = finalFiO2 - currentFiO2;
            if (Math.abs(change) < 0.05) {
                interpretation = '<span style="color: #22c55e;">Minimal FiO₂ change needed</span>';
            } else if (change > 0) {
                interpretation = `<span style="color: #f59e0b;">Increase FiO₂ by ${Math.round(change * 100)}%</span>`;
            } else {
                interpretation = `<span style="color: #f97316;">Decrease FiO₂ by ${Math.round(Math.abs(change) * 100)}%</span>`;
            }
            
            document.getElementById('fio2-interpretation').innerHTML = interpretation;
        }
        
        // Public API
        return {
            calculateIBW,
            calculatePF,
            calculateROX,
            calculateDrivingPressure,
            calculateAirwayResistance,
            calculateCompliance,
            calculateMV,
            calculateFiO2
        };
    })();
    
    // Make calculator functions globally accessible for HTML onclick handlers
    window.calculateIBW = calculatorModule.calculateIBW;
    window.calculatePF = calculatorModule.calculatePF;
    window.calculateROX = calculatorModule.calculateROX;
    window.calculateDrivingPressure = calculatorModule.calculateDrivingPressure;
    window.calculateAirwayResistance = calculatorModule.calculateAirwayResistance;
    window.calculateCompliance = calculatorModule.calculateCompliance;
    window.calculateMV = calculatorModule.calculateMV;
    window.calculateFiO2 = calculatorModule.calculateFiO2;
    
    // Make the module globally accessible
    window.calculatorModule = calculatorModule;
}
/* ---------- Initial colors on load ---------- */
document.addEventListener('DOMContentLoaded', function () {
  // Winter’s Formula
  const winterResultEl = document.getElementById('winter-paco2-result');
  const winterRangeEl  = document.getElementById('winter-range');
  const winterInterpEl = document.getElementById('winter-interpretation');
  if (winterResultEl) winterResultEl.style.color = '#7c3aed'; // purple
  if (winterRangeEl)  winterRangeEl.style.color  = '#7c3aed'; // purple
  if (winterInterpEl) winterInterpEl.style.color = 'black';    // start black

  // Desired RR
  const rrResultEl  = document.getElementById('rr-result');
  const rrInterpEl  = document.getElementById('rr-interpretation');
  if (rrResultEl) rrResultEl.style.color  = '#14b8a6'; // teal
  if (rrInterpEl) rrInterpEl.style.color = 'black';    // start black
});

/* ==================== Winter’s Formula (no measured PaCO₂) ==================== */
function calculateWinter() {
  // نظّف خطأ HCO3 فقط (لو عندك الدوال هذه)
  if (typeof clearValidationError === 'function') {
    clearValidationError('winter-hco3');
  }

  const hco3El   = document.getElementById('winter-hco3');
  const resultEl = document.getElementById('winter-paco2-result');
  const rangeEl  = document.getElementById('winter-range');
  const interpEl = document.getElementById('winter-interpretation');

  const hco3 = parseFloat(hco3El ? hco3El.value : NaN);

  // فاليديشن بسيط بدون أي حقول ثانية
  if (isNaN(hco3) || hco3 <= 0) {
    if (resultEl) resultEl.textContent = '-';
    if (rangeEl)  rangeEl.textContent  = '-';
    if (interpEl) {
      interpEl.style.color = 'black';
      interpEl.textContent = 'Please enter a valid HCO₃⁻ value.';
    }
    return;
  }

  const expected = 1.5 * hco3 + 8;
  const lower = expected - 2;
  const upper = expected + 2;
  const r1 = x => Math.round(x * 10) / 10;

  if (resultEl) resultEl.textContent = `${r1(expected)} mmHg`;
  if (rangeEl)  rangeEl.textContent  = `${r1(lower)} – ${r1(upper)} mmHg`;

  // ألوان ونص التفسير بعد النتيجة
  if (resultEl) resultEl.style.color = '#7c3aed';
  if (rangeEl)  rangeEl.style.color  = '#7c3aed';
  if (interpEl) {
    interpEl.style.color = '#22c55e';
    interpEl.textContent = 'Use this expected PaCO₂ and ±2 mmHg range for compensation assessment.';
  }
}

// تأكد إنها متاحة للزر
window.calculateWinter = calculateWinter;


/* ==================== Desired RR ==================== */
function calculateDesiredRR() {
  const rrCurrent    = parseFloat(document.getElementById('rr-current').value);
  const paCO2Current = parseFloat(document.getElementById('paco2-current').value);
  const paCO2Desired = parseFloat(document.getElementById('paco2-desired').value);

  if ([rrCurrent, paCO2Current, paCO2Desired].some(v => isNaN(v) || v <= 0)) {
    document.getElementById('rr-result').textContent = '-';
    const interpEl = document.getElementById('rr-interpretation');
    interpEl.style.color = 'black';
    interpEl.textContent = 'Please enter valid values.';
    return;
  }

  const rrDesired = (rrCurrent * paCO2Current) / paCO2Desired;
  const r1 = x => Math.round(x * 10) / 10;

  const resultEl = document.getElementById('rr-result');
  const interpEl = document.getElementById('rr-interpretation');

  resultEl.textContent = `${r1(rrDesired)} breaths/min`;

  const diff = rrDesired - rrCurrent;
  let interp = '';
  if (Math.abs(diff) < 0.5) {
    interp = 'Minimal change needed.';
  } else if (diff > 0) {
    interp = `Increase RR by ~${r1(diff)} breaths/min.`;
  } else {
    interp = `Decrease RR by ~${r1(Math.abs(diff))} breaths/min.`;
  }
  if (rrDesired < 8 || rrDesired > 35) {
    interp += ' Check safety limits & adjust VT/MV as needed.';
  }

  interpEl.textContent = interp;
  resultEl.style.color = '#14b8a6';
  interpEl.style.color = '#f59e0b'; // orange
}

/* ---------- Expose ---------- */
window.calculateWinter = calculateWinter;
window.calculateDesiredRR = calculateDesiredRR;

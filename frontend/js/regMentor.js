// Script per la registrazione di un nuovo mentor
const PLATFORM_FEE_PERCENT = 15;

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const priceInput = document.getElementById('price');
    loadOptions();

    if (priceInput) {
        priceInput.addEventListener('input', updatePayoutRequirements);
    }
    updatePayoutRequirements();
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }
});

async function loadOptions() {
    const sectorSelect = document.getElementById('expertise');
    const languageSelect = document.getElementById('language');

    if (!sectorSelect || !languageSelect) return;

    const setOptions = (selectEl, values, placeholder) => {
        selectEl.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = placeholder;
        selectEl.appendChild(defaultOpt);

        values.forEach((val) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectEl.appendChild(opt);
        });
    };

    try {
        const resp = await fetch('/api/mentor/options');
        if (!resp.ok) {
            throw new Error('Unable to load options');
        }
        const data = await resp.json();
        setOptions(sectorSelect, data.settori || [], 'Select area');
        setOptions(languageSelect, data.lingue || [], 'Select language');
    } catch (error) {
        console.error('Errore caricamento opzioni:', error);
        // fallback: lascia placeholder vuoti
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const priceInput = document.getElementById('price').value;
    const cvInput = document.getElementById('cvFile');

    const payload = {
        nome: document.getElementById('firstName').value.trim(),
        cognome: document.getElementById('lastName').value.trim(),
        mail: document.getElementById('email').value.trim(),
        data_nascita: document.getElementById('birthDate').value,
        genere: document.getElementById('gender').value,
        password: document.getElementById('password').value,
        titolo: document.getElementById('professionalTitle').value.trim(),
        organizzazione: document.getElementById('company').value.trim(),
        esperienza: document.getElementById('experience').value,
        prezzo: priceInput === '' ? undefined : parseFloat(priceInput),
        iban: document.getElementById('iban').value.trim().replace(/\s+/g, '').toUpperCase(),
        accetta_commissione_piattaforma: document.getElementById('platformFeeAck').checked,
        settore: document.getElementById('expertise').value,
        lingua: document.getElementById('language').value,
        bio: document.getElementById('bio').value.trim()
    };

    // Validazione base
    if (!payload.nome || !payload.cognome || !payload.mail || !payload.password) {
        alert('Please fill in all required fields (first name, last name, email, password)');
        return;
    }

    if (payload.password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    if (!payload.data_nascita || !payload.genere) {
        alert('Please provide date of birth and gender');
        return;
    }

    if (!payload.titolo || !payload.esperienza) {
        alert('Please enter your professional title and experience');
        return;
    }

    if (!payload.organizzazione) {
        alert('Please enter your company/organization');
        return;
    }

    if (!payload.settore || !payload.lingua || !payload.bio) {
        alert('Please fill in all mentoring fields (expertise, language, bio)');
        return;
    }

    if (priceInput !== '' && !Number.isFinite(payload.prezzo)) {
        alert('Price must be a valid number');
        return;
    }

    if (Number(payload.prezzo || 0) > 0) {
        if (!payload.iban) {
            alert('IBAN is required when your session price is greater than €0.');
            return;
        }
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(payload.iban)) {
            alert('Please provide a valid IBAN.');
            return;
        }
        if (!payload.accetta_commissione_piattaforma) {
            alert(`You must accept the platform fee (${PLATFORM_FEE_PERCENT}%) for paid sessions.`);
            return;
        }
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });

    if (cvInput && cvInput.files && cvInput.files.length > 0) {
        formData.append('cv_file', cvInput.files[0]);
    } else {
        alert('Please upload your resume (PDF/DOC)');
        return;
    }

    try {
        const response = await fetch('/api/auth/register/mentor', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            alert('Registration completed successfully! Welcome ' + payload.nome + '!\n\nNow set your weekly availability.');
            window.location.href = '/pages/avMentor.html';
        } else {
            alert('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration error: ' + error.message);
    }
}

function updatePayoutRequirements() {
    const priceInput = document.getElementById('price');
    const ibanInput = document.getElementById('iban');
    const feeAck = document.getElementById('platformFeeAck');
    const feeHint = document.getElementById('platformFeeHint');
    if (!priceInput || !ibanInput || !feeAck || !feeHint) return;

    const price = Number(priceInput.value || 0);
    const isPaidSession = Number.isFinite(price) && price > 0;

    ibanInput.required = isPaidSession;
    feeAck.required = isPaidSession;
    feeAck.disabled = !isPaidSession;

    if (!isPaidSession) {
        feeAck.checked = false;
    }

    const keepAmount = isPaidSession ? (price * (PLATFORM_FEE_PERCENT / 100)) : 0;
    const mentorNet = isPaidSession ? (price - keepAmount) : 0;
    feeHint.textContent = isPaidSession
        ? `Platform fee: ${PLATFORM_FEE_PERCENT}% (€${keepAmount.toFixed(2)}). Mentor receives €${mentorNet.toFixed(2)}.`
        : `Set a price > 0 to enable payouts. Platform fee is ${PLATFORM_FEE_PERCENT}%.`;
}

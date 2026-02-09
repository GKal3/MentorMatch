// Script per la registrazione di un nuovo mentor
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    loadOptions();
    
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
            throw new Error('Impossibile caricare le opzioni');
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
        settore: document.getElementById('expertise').value,
        lingua: document.getElementById('language').value,
        bio: document.getElementById('bio').value.trim()
    };

    // Validazione base
    if (!payload.nome || !payload.cognome || !payload.mail || !payload.password) {
        alert('Compila tutti i campi obbligatori (nome, cognome, email, password)');
        return;
    }

    if (payload.password.length < 8) {
        alert('La password deve essere di almeno 8 caratteri');
        return;
    }

    if (!payload.data_nascita || !payload.genere) {
        alert('Compila data di nascita e genere');
        return;
    }

    if (!payload.titolo || !payload.esperienza) {
        alert('Inserisci titolo professionale ed esperienza');
        return;
    }

    if (!payload.organizzazione) {
        alert('Inserisci azienda/organizzazione');
        return;
    }

    if (!payload.settore || !payload.lingua || !payload.bio) {
        alert('Compila tutti i campi relativi al mentoring (settore, lingua, bio)');
        return;
    }

    if (priceInput !== '' && !Number.isFinite(payload.prezzo)) {
        alert('Il prezzo deve essere un numero valido');
        return;
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
        alert('Carica il tuo CV (PDF/DOC)');
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

            alert('Registrazione completata con successo! Benvenuto/a ' + payload.nome + '!\n\nOra imposta la tua disponibilità settimanale.');
            window.location.href = '/pages/avMentor.html';
        } else {
            alert('Errore: ' + result.message);
        }

    } catch (error) {
        console.error('Errore nella registrazione:', error);
        alert('Errore nella registrazione: ' + error.message);
    }
}

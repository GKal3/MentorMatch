document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentor')) return;

    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
        setSaveButtonEnabled(false);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = '/pages/dashboardMentor.html';
        });
    }

    initForm().then(() => {
        initializeDirtyTracking();
    });
});

let initialFormState = null;
const trackedFieldIds = [
    'firstName', 'lastName', 'email', 'birthDate', 'gender',
    'professionalTitle', 'organization', 'experience', 'expertise',
    'language', 'bio', 'price', 'iban'
];

function initializeDirtyTracking() {
    initialFormState = getCurrentFormState();

    trackedFieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (!field) return;
        const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
        field.addEventListener(eventName, refreshSaveButtonState);
        if (eventName !== 'change') {
            field.addEventListener('change', refreshSaveButtonState);
        }
    });

    refreshSaveButtonState();
}

function getCurrentFormState() {
    const priceValue = getTrimmedValue('price');
    return {
        firstName: getTrimmedValue('firstName'),
        lastName: getTrimmedValue('lastName'),
        email: getTrimmedValue('email'),
        birthDate: getTrimmedValue('birthDate'),
        gender: getTrimmedValue('gender'),
        professionalTitle: getTrimmedValue('professionalTitle'),
        organization: getTrimmedValue('organization'),
        experience: getTrimmedValue('experience'),
        expertise: getTrimmedValue('expertise'),
        language: getTrimmedValue('language'),
        bio: getTrimmedValue('bio'),
        price: priceValue,
        iban: getTrimmedValue('iban').replace(/\s+/g, '').toUpperCase()
    };
}

function hasUnsavedChanges() {
    if (!initialFormState) return false;
    const currentState = getCurrentFormState();
    return JSON.stringify(currentState) !== JSON.stringify(initialFormState);
}

function refreshSaveButtonState() {
    setSaveButtonEnabled(hasUnsavedChanges());
}

function setSaveButtonEnabled(isEnabled) {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;
    saveBtn.disabled = !isEnabled;
    saveBtn.classList.toggle('is-disabled', !isEnabled);
    saveBtn.setAttribute('aria-disabled', String(!isEnabled));
}

async function initForm() {
    await loadOptions();
    await loadProfile();
}

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
        console.error('Error loading options:', error);
    }
}

async function loadProfile() {
    const token = getToken();
    const user = getCurrentUser();

    if (!user?.id) return;

    try {
        const response = await fetch(`/api/mentor/personal/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error loading profile');
        }

        const data = await response.json();

        setInputValue('firstName', data.Nome);
        setInputValue('lastName', data.Cognome);
        setInputValue('email', data.Mail);
        setInputValue('birthDate', formatDateForInput(data.Data_Nascita));
        setInputValue('gender', normalizeGenderValue(data.Genere));
        setInputValue('professionalTitle', data.Titolo);
        setInputValue('organization', data.Organizzazione);
        setInputValue('experience', data.Esperienza);
        setInputValue('expertise', data.Settore);
        setInputValue('language', data.Lingua);
        setInputValue('bio', data.Bio);
        setInputValue('price', data.Prezzo);
        setInputValue('iban', data.IBAN);
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Unable to load profile data. Check the console for details.');
    }
}

async function handleSave(e) {
    e.preventDefault();

    if (!hasUnsavedChanges()) return;

    const token = getToken();
    const user = getCurrentUser();

    if (!user?.id) return;

    const priceValue = getTrimmedValue('price');
    const payload = {
        nome: getTrimmedValue('firstName'),
        cognome: getTrimmedValue('lastName'),
        mail: getTrimmedValue('email'),
        data_nascita: getTrimmedValue('birthDate'),
        genere: getTrimmedValue('gender'),
        titolo: getTrimmedValue('professionalTitle'),
        organizzazione: getTrimmedValue('organization'),
        esperienza: getTrimmedValue('experience'),
        prezzo: priceValue === '' ? null : Number(priceValue),
        iban: getTrimmedValue('iban').replace(/\s+/g, '').toUpperCase(),
        settore: getTrimmedValue('expertise'),
        lingua: getTrimmedValue('language'),
        bio: getTrimmedValue('bio')
    };

    if (priceValue !== '' && !Number.isFinite(payload.prezzo)) {
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
    }

    try {
        const response = await fetch(`/api/mentor/personal/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.message || 'Error updating profile');
        }

        if (result.emailChangeRequested) {
            alert('We sent a confirmation email to your new address. Confirm it to complete the change.');
        } else {
            alert('Profile updated successfully.');
        }
        window.location.href = '/pages/dashboardMentor.html';
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Unable to update profile. Check the console for details.');
    }
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value ?? '';
}

function getTrimmedValue(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
}

function formatDateForInput(dateValue) {
    if (!dateValue) return '';
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
        return dateValue.slice(0, 10);
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeGenderValue(value) {
    if (!value) return '';
    if (value === 'M') return 'Male';
    if (value === 'F') return 'Female';
    if (value === 'Altro') return 'Prefer not to say';
    return value;
}

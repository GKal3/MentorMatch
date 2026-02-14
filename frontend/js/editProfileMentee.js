document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!requireRole('mentee')) return;

    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
        setSaveButtonEnabled(false);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = '/pages/dashboardMentee.html';
        });
    }

    loadProfile().then(() => {
        initializeDirtyTracking();
    });
});

let initialFormState = null;
const trackedFieldIds = ['firstName', 'lastName', 'email', 'birthDate', 'gender', 'occupation', 'bio'];

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
    return {
        firstName: getTrimmedValue('firstName'),
        lastName: getTrimmedValue('lastName'),
        email: getTrimmedValue('email'),
        birthDate: getTrimmedValue('birthDate'),
        gender: getTrimmedValue('gender'),
        occupation: getTrimmedValue('occupation'),
        bio: getTrimmedValue('bio')
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

async function loadProfile() {
    const token = getToken();
    const user = getCurrentUser();

    if (!user?.id) return;

    try {
        const response = await fetch(`http://localhost:3000/api/mentee/personal/${user.id}`, {
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
        setInputValue('occupation', data.Occupazione);
        setInputValue('bio', data.Bio);
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

    const payload = {
        nome: getTrimmedValue('firstName'),
        cognome: getTrimmedValue('lastName'),
        mail: getTrimmedValue('email'),
        data_nascita: getTrimmedValue('birthDate'),
        genere: getTrimmedValue('gender'),
        occupazione: getTrimmedValue('occupation'),
        bio: getTrimmedValue('bio')
    };

    try {
        const response = await fetch(`http://localhost:3000/api/mentee/personal/${user.id}`, {
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
        window.location.href = '/pages/dashboardMentee.html';
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

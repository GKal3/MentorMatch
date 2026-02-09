// Script per la registrazione di un nuovo mentee
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }
});

async function handleSubmit(e) {
    e.preventDefault();
    
    // Raccogli i dati dal form
    const formData = {
        nome: document.getElementById('firstName').value.trim(),
        cognome: document.getElementById('lastName').value.trim(),
        mail: document.getElementById('email').value.trim(),
        data_nascita: document.getElementById('birthDate').value,
        genere: document.getElementById('gender').value,
        password: document.getElementById('password').value,
        occupazione: document.getElementById('occupation').value.trim(),
        bio: document.getElementById('bio').value.trim() || null
    };
    
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validazione base
    if (!formData.nome || !formData.cognome || !formData.mail || !formData.password) {
        alert('Compila tutti i campi obbligatori (nome, cognome, email, password)');
        return;
    }
    
    if (!formData.data_nascita || !formData.genere) {
        alert('Compila data di nascita e genere');
        return;
    }
    
    if (!formData.occupazione) {
        alert('Inserisci la tua occupazione attuale');
        return;
    }
    
    if (formData.password.length < 6) {
        alert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    if (formData.password !== confirmPassword) {
        alert('Le password non corrispondono');
        return;
    }
    
    console.log('Invio registrazione mentee:', formData);
    
    try {
        const response = await fetch('/api/auth/register/mentee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Salva il token
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            alert('Registrazione completata con successo! Benvenuto/a ' + formData.nome + '!');
            
            // Redirect alla pagina di ricerca mentor o login
            window.location.href = '/pages/search.html';
        } else {
            alert('Errore: ' + result.message);
        }
        
    } catch (error) {
        console.error('Errore nella registrazione:', error);
        alert('Errore nella registrazione: ' + error.message);
    }
}

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
        alert('Please fill in all required fields (first name, last name, email, password)');
        return;
    }
    
    if (!formData.data_nascita || !formData.genere) {
        alert('Please provide date of birth and gender');
        return;
    }
    
    if (!formData.occupazione) {
        alert('Please enter your current occupation');
        return;
    }
    
    if (formData.password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    if (formData.password !== confirmPassword) {
        alert('Passwords do not match');
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
            
            alert('Registration completed successfully! Welcome ' + formData.nome + '!');
            
            // Redirect alla dashboard mentee
            window.location.href = '/pages/dashboardMentee.html';
        } else {
            alert('Error: ' + result.message);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration error: ' + error.message);
    }
}

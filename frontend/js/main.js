import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Gestione bottone login nella home page
  const btnLogin = document.querySelector('.btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      window.location.href = '/pages/login.html';
    });
  }

  // Codice esistente per test (commentato)
  /*
  const button = document.getElementById('caricaUtenti');
  const risultati = document.getElementById('risultati');

  if (button && risultati) {
    button.addEventListener('click', async () => {
      try {
        const utenti = await api.getUsers();
        
        risultati.innerHTML = '<h2>Risultati:</h2>';
        utenti.forEach(utente => {
          risultati.innerHTML += `
            <div class="utente">
              <p><strong>ID:</strong> ${utente.Id}</p>
              <p><strong>Nome:</strong> ${utente.Nome}</p>
              <p><strong>Email:</strong> ${utente.Mail}</p>
            </div>
          `;
        });
      } catch (error) {
        risultati.innerHTML = '<p class="errore">Errore nel caricamento dei dati!</p>';
        console.error('Errore:', error);
      }
    });
  }
  */
});
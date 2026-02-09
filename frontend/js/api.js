const API_URL = 'http://localhost:3000/api';

export const api = {
  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Errore nel caricamento');
    return response.json();
  },

  async getUserById(id) {
    const response = await fetch(`${API_URL}/users/${id}`);
    if (!response.ok) throw new Error('Utente non trovato');
    return response.json();
  },

  async createUser(userData) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Errore nella creazione');
    return response.json();
  },

  async updateUser(id, userData) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Errore nell\'aggiornamento');
    return response.json();
  },

  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Errore nell\'eliminazione');
    return response.json();
  }
};
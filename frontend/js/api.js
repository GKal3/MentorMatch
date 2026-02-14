const API_URL = '/api';

export const api = {
  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Error loading users');
    return response.json();
  },

  async getUserById(id) {
    const response = await fetch(`${API_URL}/users/${id}`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  },

  async createUser(userData) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Error creating user');
    return response.json();
  },

  async updateUser(id, userData) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Error updating user');
    return response.json();
  },

  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error deleting user');
    return response.json();
  }
};
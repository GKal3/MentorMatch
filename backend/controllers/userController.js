import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nel recupero degli utenti" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nel recupero dell'utente" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { nome, email, password } = req.body;
    const newUser = await User.create(nome, email, password);
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nella creazione dell'utente" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { nome, email } = req.body;
    const updatedUser = await User.update(req.params.id, nome, email);
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nell'aggiornamento dell'utente" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.json({ message: "Utente eliminato con successo" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nell'eliminazione dell'utente" });
  }
};
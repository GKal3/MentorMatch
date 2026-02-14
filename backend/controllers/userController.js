import User from "../models/User.js";
import { requestEmailChange, confirmEmailChange } from "../utils/emailChangeService.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching users" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching user" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { nome, email, password } = req.body;
    const newUser = await User.create(nome, email, password);
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating user" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { nome, email } = req.body;
    const updatedUser = await User.update(req.params.id, nome, email);
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating user" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting user" });
  }
};

export const requestEmailChangeForUser = async (req, res) => {
  try {
    const { mail } = req.body;
    const { requested } = await requestEmailChange(req.user.id, mail);

    res.json({
      success: true,
      emailChangeRequested: requested,
      message: requested
        ? 'Confirmation email sent to the new address.'
        : 'Email unchanged.',
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error requesting email change',
    });
  }
};

export const confirmEmailChangeForUser = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send('Missing confirmation token.');
    }

    await confirmEmailChange(token);

    return res.send('Email updated successfully. You can close this page and log in again if needed.');
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).send(error.message || 'Error confirming email change.');
  }
};
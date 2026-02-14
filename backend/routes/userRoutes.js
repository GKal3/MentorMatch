import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  requestEmailChangeForUser,
  confirmEmailChangeForUser,
} from "../controllers/userController.js";
import { ValidaJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/email-change/request', ValidaJWT, requestEmailChangeForUser);
router.get('/email-change/confirm', confirmEmailChangeForUser);

router.get("/", getAllUsers);
router.post("/", createUser);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
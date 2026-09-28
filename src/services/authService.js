import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../config/db.js";
import CustomError from "../utils/customError.js";
import { ERROR_MESSAGES } from "../utils/errorMessages.js";
import { UserModel } from "../model/userModel.js";

const SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_TILL_DAYS = Number(process.env.REFRESH_TOKEN_TILL_DAYS || 30);

const generateAccessToken = (user) => {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateAndStoreRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TILL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt],
  );

  return token;
};

const isEmptyFields = (...fields) => {
  if (fields.some((field) => !field)) {
    throw new CustomError("Field(s) data are required", 400);
  }
};

const tokenHandler = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateAndStoreRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
  };
};

export const AuthService = {
  async signup(name, email, password, role) {
    isEmptyFields(name, email, password, role);

    // isEmptyFields({ email, passord });

    const isExist = await UserModel.findByEmail(email);
    if (isExist) {
      throw new CustomError("User Already Exists", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({name,  email, passwordHash, role });

    const { accessToken, refreshToken } = await tokenHandler(user);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  },

  async signin(email, password) {
    isEmptyFields(email, password);

    const user = await UserModel.findByEmail(email);

    if (!user) {
      throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404);
    }

    const isMatch = await bcrypt.compare(
      password,
      user.passwordHash || user.password_hash,
    );
    if (!isMatch) {
      throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 401);
    }

    const { accessToken, refreshToken } = await tokenHandler(user);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  },

  async refreshToken(oldRefreshToken) {
    isEmptyFields(oldRefreshToken);

    const result = await db.query(
      "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
      [oldRefreshToken],
    );
    const stored = result.rows[0];
    if (!stored) {
      throw new CustomError("Invalid or expired refresh token", 401);
    }

    await db.query("DELETE FROM refresh_tokens WHERE id = $1", [stored.id]);

    const userResult = await db.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [stored.user_id],
    );
    const user = userResult.rows[0] || { id: stored.user_id };

    const { accessToken, refreshToken } = await tokenHandler(user);

    return {
      accessToken,
      refreshToken,
    };
  },
};

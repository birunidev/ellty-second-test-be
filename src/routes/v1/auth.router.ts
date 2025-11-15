import {
  handleLogin,
  handleRegister,
  handleMe,
  handleLogout,
} from "../../controllers/auth.controller";
import { contract } from "./contracts";
import { initServer } from "@ts-rest/express";

const s = initServer();
export const authRouter = s.router(contract.auth, {
  register: ({ body }) => handleRegister(body),
  login: ({ body, res }) => handleLogin(body, res),
  me: ({ req }) => handleMe(req),
  logout: ({ req, res }) => handleLogout(req, res),
});

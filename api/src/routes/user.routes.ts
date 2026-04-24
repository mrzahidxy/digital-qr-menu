import { UserRole } from "@prisma/client";
import { Router } from "express";

import { userController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../schemas/user.schema";

const router = Router();

router.get(
  "/",
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(listUsersQuerySchema, "query"),
  userController.list,
);

router.get(
  "/:id",
  requireAuth(),
  validateRequest(userIdParamSchema, "params"),
  userController.getById,
);

router.post(
  "/",
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),
  validateRequest(createUserSchema),
  userController.create,
);

router.patch(
  "/:id",
  requireAuth(),
  validateRequest(userIdParamSchema, "params"),
  validateRequest(updateUserSchema),
  userController.update,
);

router.put(
  "/:id/role",
  requireAuth({ roles: [UserRole.SUPER_ADMIN] }),

  validateRequest(userIdParamSchema, "params"),
  validateRequest(updateUserRoleSchema),
  userController.updateRole,
);

router.delete(
  "/:id",
  validateRequest(userIdParamSchema, "params"),
  userController.remove,
);

export default router;

import type { PublicUser } from "@/common/types";
import type { User } from "../db/entities/User";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickName: user.nickName,
    telNo: user.telNo,
  };
}

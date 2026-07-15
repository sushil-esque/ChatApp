import { prisma } from "../db/prisma.js";
import { CustomError } from "../errors/customError.js";
import bcrypt from "bcrypt";

export async function searchUsers(query: string, currentUserId: string) {
  return prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        { verified: true },
        {
          OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
    take: 10,
  });
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      verified: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updateProfile(userId: string, data: { name?: string; newPassword?: string; oldPassword?: string }) {
  if (data.newPassword && data.oldPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new CustomError("User not found", 404);
    const isPasswordValid = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!isPasswordValid) throw new CustomError("Invalid old password", 400);
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
      },
    });
  }
  if (data.name){
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new CustomError("User not found", 404);
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
    });
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Enter your email and password." };

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return { error: "Invalid email or password." };

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  await createAdminSession({ adminId: admin.id, email: admin.email, name: admin.name });
  redirect("/admin/events");
}

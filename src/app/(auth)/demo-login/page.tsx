import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export default function DemoLoginRedirect() {
  const user = getSessionUser();
  redirect(user ? "/" : "/login");
}
import { redirect } from "next/navigation";
import { isAuth } from "@/lib/auth";

export default async function RootPage() {
  if (await isAuth()) redirect("/dashboard");
  redirect("/login");
}

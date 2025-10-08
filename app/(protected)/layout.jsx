import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientLayout from "./ClientLayout";

export default async function Layout({ children }) {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get("auth")?.value;

  if (!isAuthed) {
    redirect("/login");
  }

  return <ClientLayout>{children}</ClientLayout>;
}

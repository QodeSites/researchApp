import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const cookieStore = await cookies()
  const isAuthed = cookieStore.get("auth")?.value
  console.log(isAuthed)
  console.log("========================")
  redirect(isAuthed ? "/dashboard" : "/login")
}
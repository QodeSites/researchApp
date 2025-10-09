
import "@/app/globals.css"
import { Lato, Playfair_Display } from "next/font/google"
import { PermissionsProvider } from "@/contexts/PermissionsContext";
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata = {
  title: "Qode 360",
  description: "Qode 360",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${lato.variable} ${playfair.variable} antialiased`}>
      <body className="font-sans bg-background text-foreground">
        <PermissionsProvider>{children}</PermissionsProvider>
      </body>
    </html>
  )
}
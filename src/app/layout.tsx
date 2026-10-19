import type { Metadata } from "next";
import "./styles.css";
import "./intro.css";
import "./admin-enhancements.css";

export const metadata: Metadata = {
  title: "Elecciones Municipales Escolares 2026 | Ricardo Palma",
  description: "Sistema de votación escolar de la Institución Educativa Ricardo Palma de Marcona.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
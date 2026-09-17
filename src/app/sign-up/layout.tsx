import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create an account — Drop of Water",
  description: "Join Drop of Water to fund wells and run your own campaigns.",
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}

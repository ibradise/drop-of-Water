import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in — Drop of Water",
  description: "Sign in to manage your giving, campaigns, and certificates.",
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}

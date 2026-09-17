import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Welcome aboard — Drop of Water",
  description: "Set up your Drop of Water profile in under a minute.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}

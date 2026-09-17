import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Certificate ${code} — Drop of Water`,
    description: "Verify a Drop of Water contribution certificate.",
  };
}

export default function CertificateCodeLayout({ children }: { children: ReactNode }) {
  return children;
}

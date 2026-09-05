import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30">
        <Compass className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          We can&apos;t find that page
        </h1>
        <p className="mt-2 max-w-md text-slate-600">
          The link may be wrong, or the page may have been moved. Try one of
          these instead.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button size="lg">
            <Home className="h-4 w-4" />
            Back home
          </Button>
        </Link>
        <Link href="/campaigns">
          <Button size="lg" variant="outline">
            <Search className="h-4 w-4" />
            Browse campaigns
          </Button>
        </Link>
      </div>
    </div>
  );
}

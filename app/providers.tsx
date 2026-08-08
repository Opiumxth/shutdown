"use client";

import { PortalProvider } from "@portalsdk/react";
import { Suspense, type ReactNode } from "react";
import { RouteInterferenceLayer } from "@/components/cursor";
import { portal } from "@/lib/portal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PortalProvider client={portal}>
      <Suspense fallback={null}>
        <RouteInterferenceLayer />
      </Suspense>
      {children}
    </PortalProvider>
  );
}

"use client";

import { PortalProvider } from "@portalsdk/react";
import type { ReactNode } from "react";
import { portal } from "@/lib/portal";

export function Providers({ children }: { children: ReactNode }) {
  return <PortalProvider client={portal}>{children}</PortalProvider>;
}

import { Portal } from "@portalsdk/core";

export const portal = new Portal({
  apiKey: process.env.NEXT_PUBLIC_PORTAL_API_KEY!,
});

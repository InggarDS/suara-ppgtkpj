"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "./spinner";

/**
 * Drop inside a <Link> to show a spinner while that navigation is in flight.
 * Relies on Next's useLinkStatus (App Router).
 */
export function LinkPending({ className = "w-3.5 h-3.5" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}

"use client";

import { ProtectedRoute } from './protectedRoute';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
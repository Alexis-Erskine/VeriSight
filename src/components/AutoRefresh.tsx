"use client";

import { useEffect } from "react";

export default function AutoRefresh({ interval = 5000 }) {
  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), interval);
    return () => clearTimeout(id);
  }, [interval]);
  return null;
}

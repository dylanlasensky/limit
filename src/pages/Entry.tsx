import BrandLoading from "@/components/limit/BrandLoading";
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
export default function Entry() {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    base44.entities.UserProfile.list().then((x: any[]) =>
      setDone(Boolean(x[0]?.onboardingComplete))
    );
  }, []);
  if (done === null) return <BrandLoading />;
  return <Navigate to={done ? "/home" : "/onboarding"} replace />;
}

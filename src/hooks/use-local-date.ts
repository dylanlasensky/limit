import { useEffect, useState } from "react";
import { localDay } from "@/components/workout/workoutDraft";
export default function useLocalDate() {
  const [date, setDate] = useState(() => localDay());
  useEffect(() => {
    const update = () => setDate(localDay());
    const timer = setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return date;
}

import { useQuery } from "@tanstack/react-query";
import { limitApi } from "@/api/client";
import { scheduleForDate } from "../../packages/domain/workoutSchedule.js";
import { weekStart } from "../../packages/domain/workoutSchedule.js";

export function useWeekSchedule(
  planId: string | undefined,
  userId: string | undefined,
  today: string
) {
  return useQuery({
    queryKey: ["workoutScheduleChanges", userId, planId, weekStart(today)],
    enabled: !!planId && !!userId,
    queryFn: () =>
      limitApi.entities.WorkoutScheduleChange.filter(
        { planId, active: true, fromDate: { $gte: weekStart(today) } },
        "created_date",
        100
      ),
    staleTime: 15000,
  });
}

export function scheduledDay(days: any[], changes: any[], date: string) {
  return scheduleForDate(days, changes, date);
}

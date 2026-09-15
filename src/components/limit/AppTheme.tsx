import useSystemTheme from "@/hooks/use-system-theme";

/** Keep direct workout, sign-in and loading routes in the chosen theme too. */
export default function AppTheme() {
  useSystemTheme();
  return null;
}

import { Link } from "react-router-dom";

export default function PublicLinks() {
  return (
    <nav
      aria-label="Help and legal information"
      className="mt-5 flex flex-wrap justify-center gap-x-5 text-xs text-muted-foreground"
    >
      <Link className="grid min-h-11 place-items-center hover:text-primary" to="/privacy">
        Privacy
      </Link>
      <Link className="grid min-h-11 place-items-center hover:text-primary" to="/terms">
        Terms & safety
      </Link>
      <Link className="grid min-h-11 place-items-center hover:text-primary" to="/support">
        Help & support
      </Link>
    </nav>
  );
}

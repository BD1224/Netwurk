// "/" route. Just redirects to /search (the Discover page).
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/search");
}

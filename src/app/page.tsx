// "/" route. Just redirects to /search.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/search");
}

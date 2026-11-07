// "/" route. There is no landing page yet, so it goes straight to Discover
// (the proxy sends signed-out visitors on to /signin).
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/discover");
}

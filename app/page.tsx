import { redirect } from "next/navigation";

// The leads table is the home page; the AI test page lives at /s.
export default function Page() {
  redirect("/leads");
}

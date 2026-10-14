import { redirect } from "next/navigation";

/** The old presenter-mode demo now lives inside the product: Mission Control → "Simulate incident". */
export default function DemoRedirect() {
  redirect("/command?simulate=1");
}

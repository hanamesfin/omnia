import { redirect } from "next/navigation";

export default function AgentIdRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/yours/${params.id}`);
}

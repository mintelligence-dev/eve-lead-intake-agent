import { AiTestPage } from "@/app/_components/ai-test-page";

export default async function TestResultPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <AiTestPage sessionId={sessionId} />;
}

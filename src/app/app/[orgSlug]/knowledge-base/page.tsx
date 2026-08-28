import { auth } from "@clerk/nextjs/server";

import { KnowledgeBaseScreen } from "@/components/dashboard/knowledge-base-screen";

export default async function KnowledgeBasePage() {
  await auth.protect();

  return <KnowledgeBaseScreen />;
}

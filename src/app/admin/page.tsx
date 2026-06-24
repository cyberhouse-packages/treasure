import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/adminAuth";
import { env } from "@/lib/env";
import { AdminDashboard, type AdminStone } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!isAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const stones = await prisma.stone.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      recordings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { durationMs: true, state: true, createdAt: true },
      },
    },
  });

  const data: AdminStone[] = stones.map((s) => ({
    id: s.id,
    qrToken: s.qrToken,
    tagUid: s.tagUid,
    label: s.label,
    status: s.status,
    durationMs: s.recordings[0]?.durationMs ?? null,
    recordedAt: s.recordings[0]?.createdAt?.toISOString() ?? null,
    recordUrl: `${env.appBaseUrl}/s/${s.qrToken}`,
  }));

  return <AdminDashboard stones={data} />;
}

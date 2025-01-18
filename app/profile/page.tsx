import prisma from "@/app/utils/db";
import { requireUser } from "@/app/utils/hooks";
import { notFound } from "next/navigation";
import Profile from "../components/Profile";

async function getData(userId: string) {
  const data = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!data) {
    return notFound();
  }

  return data;
}

export default async function EditInvoiceRoute() {
  const session = await requireUser();
  const data = await getData(session.user?.id as string);

  return <Profile data={data} />;
}

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Unwrap dynamic route parameters
  const { id: contactId } = await context.params;

  // Ensure session typing matches our app
  const user = session.user as {
    id: string;
    role: string;
    name?: string | null;
  };

  const { content } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Empty note" }, { status: 400 });
  }

  const note = await prisma.bookingNote.create({
    data: {
      contactId,            // NOW DEFINITELY A STRING
      authorId: user.id,
      content: content.trim(),
    },
  });

  return NextResponse.json({ note });
}

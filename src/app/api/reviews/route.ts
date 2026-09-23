import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { REVIEW_TAGS } from "@/lib/reviewTag";

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json(
      { error: "Missing bookId (?bookId=...)" },
      { status: 400 }
    );
  }

  const reviews = await prisma.review.findMany({
    where: { bookId },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "You have to be logged in" },
      { status: 401 }
    );
  }

  const { bookId, rating, content, tags } = await request.json();

  if (!bookId || typeof rating !== "number" || rating < 1 || rating > 10) {
    return NextResponse.json(
      { error: "Missing bookId or invalid rating (must be 1-10)" },
      { status: 400 }
    );
  }

  const safeTag: string[] = Array.isArray(tags)
    ? tags.filter(
      (tag): tag is string =>
        typeof tag == "string" && (REVIEW_TAGS as readonly string[]).includes(tag)
    )
    : [];

  const review = await prisma.review.upsert({
    where: { userId_bookId: { userId: session.user.id, bookId } },
    update: { rating, content: content ?? null, tags: safeTag },
    create: { userId: session.user.id, bookId, rating, content: content ?? null, tags: safeTag },
  });

  revalidatePath(`/book/${bookId}`);

  return NextResponse.json(review);
}

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notifyUser } from "../lib/notifications.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const contactRequestsRouter = Router();
contactRequestsRouter.use(requireAuth);

const requestInput = z.object({
  recipientUsername: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
  type: z.enum(["HIRE", "COLLABORATION"]),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(20).max(4000),
});

contactRequestsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  const parsed = requestInput.safeParse(req.body);
  if (!parsed.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to contact a creator." : parsed.error?.issues[0]?.message ?? "Invalid contact request." },
    });
    return;
  }
  try {
    const recipient = await prisma.user.findFirst({
      where: { username: parsed.data.recipientUsername, deletedAt: null },
      select: { id: true, username: true, profile: { select: { fullName: true } } },
    });
    if (!recipient) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Creator not found." } });
      return;
    }
    if (recipient.id === req.userId) {
      res.status(409).json({ error: { code: "SELF_CONTACT", message: "You cannot send a request to yourself." } });
      return;
    }
    const existing = await prisma.contactRequest.findFirst({
      where: { senderId: req.userId, recipientId: recipient.id, status: "PENDING" },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: { code: "REQUEST_PENDING", message: "You already have a pending request with this creator." } });
      return;
    }
    const data = await prisma.contactRequest.create({
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        message: parsed.data.message,
        senderId: req.userId,
        recipientId: recipient.id,
      },
      select: { id: true, type: true, status: true, subject: true, createdAt: true },
    });
    await notifyUser({
      userId: recipient.id,
      type: "CONTACT_REQUEST",
      title: parsed.data.type === "HIRE" ? "A new hiring request" : "A new collaboration request",
      body: `${parsed.data.subject} — open your requests to review and reply.`,
      href: "/dashboard/requests",
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

contactRequestsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  const direction = z.enum(["incoming", "outgoing"]).safeParse(req.query.direction ?? "incoming");
  if (!direction.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request direction." } });
    return;
  }
  try {
    const data = await prisma.contactRequest.findMany({
      where: direction.data === "incoming" ? { recipientId: req.userId } : { senderId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sender: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true, professionalTitle: true } } } },
        recipient: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true, professionalTitle: true } } } },
      },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

contactRequestsRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const parsed = z.object({ status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED"]) }).safeParse(req.body);
  if (!id.success || !parsed.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to continue." : "Choose a valid request decision." },
    });
    return;
  }
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const request = await transaction.contactRequest.findFirst({
        where: {
          id: id.data,
          ...(parsed.data.status === "CANCELLED" ? { senderId: req.userId } : { recipientId: req.userId }),
          status: "PENDING",
        },
        include: {
          sender: { select: { id: true, username: true } },
          recipient: { select: { id: true, username: true } },
        },
      });
      if (!request) return null;
      const changed = await transaction.contactRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: parsed.data.status },
      });
      if (!changed.count) return null;
      const updated = await transaction.contactRequest.findUniqueOrThrow({ where: { id: request.id } });
      let conversationId: string | null = null;
      if (parsed.data.status === "ACCEPTED") {
        const [userAId, userBId] = [request.senderId, request.recipientId].sort();
        const conversation = await transaction.conversation.upsert({
          where: { userAId_userBId: { userAId, userBId } },
          create: { userAId, userBId },
          update: {},
          select: { id: true },
        });
        conversationId = conversation.id;
        await transaction.message.create({
          data: { conversationId, senderId: request.senderId, body: request.message },
        });
        await transaction.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });
      }
      return { request: updated, conversationId, sender: request.sender, recipient: request.recipient };
    });
    if (!result) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Pending request not found or you cannot update it." } });
      return;
    }
    if (parsed.data.status !== "CANCELLED") {
      const statusText = parsed.data.status === "ACCEPTED" ? "accepted" : "declined";
      await notifyUser({
        userId: result.sender.id,
        type: `CONTACT_REQUEST_${parsed.data.status}`,
        title: `Your ${result.request.type.toLowerCase()} request was ${statusText}`,
        body: parsed.data.status === "ACCEPTED"
          ? `@${result.recipient.username} accepted your request. You can continue the conversation in messages.`
          : `@${result.recipient.username} declined your request.`,
        href: result.conversationId ? `/dashboard/messages?conversation=${result.conversationId}` : "/dashboard/requests?direction=outgoing",
      });
    } else {
      await notifyUser({
        userId: result.recipient.id,
        type: "CONTACT_REQUEST_CANCELLED",
        title: "A contact request was withdrawn",
        body: `@${result.sender.username} withdrew a pending contact request.`,
        href: "/dashboard/requests",
      });
    }
    res.json({ data: { ...result.request, conversationId: result.conversationId } });
  } catch (error) {
    next(error);
  }
});

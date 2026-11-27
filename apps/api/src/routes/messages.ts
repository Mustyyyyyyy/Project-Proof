import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notifyUser } from "../lib/notifications.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get("/conversations", async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: req.userId }, { userBId: req.userId }] },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      include: {
        userA: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        userB: { select: { id: true, username: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { readAt: null, senderId: { not: req.userId } } } } },
      },
    });
    res.json({
      data: conversations.map((conversation) => ({
        ...conversation,
        otherUser: conversation.userAId === req.userId ? conversation.userB : conversation.userA,
        lastMessage: conversation.messages[0] ?? null,
        unreadCount: conversation._count.messages,
        messages: undefined,
        userA: undefined,
        userB: undefined,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/conversations", async (req: AuthenticatedRequest, res, next) => {
  const parsed = z.object({
    recipientUsername: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
    body: z.string().trim().min(1).max(5000),
  }).safeParse(req.body);
  if (!parsed.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to send messages." : parsed.error?.issues[0]?.message ?? "Invalid message." },
    });
    return;
  }
  try {
    const recipient = await prisma.user.findFirst({
      where: { username: parsed.data.recipientUsername, deletedAt: null },
      select: { id: true, username: true },
    });
    if (!recipient) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }
    if (recipient.id === req.userId) {
      res.status(409).json({ error: { code: "SELF_MESSAGE", message: "You cannot message yourself." } });
      return;
    }
    const [userAId, userBId] = [req.userId, recipient.id].sort();
    const message = await prisma.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: {},
        select: { id: true },
      });
      const data = await transaction.message.create({
        data: { conversationId: conversation.id, senderId: req.userId!, body: parsed.data.body },
      });
      await transaction.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: data.createdAt } });
      return { conversationId: conversation.id, message: data };
    });
    await notifyUser({
      userId: recipient.id,
      type: "MESSAGE",
      title: `New message from @${(await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } }))?.username ?? "a creator"}`,
      body: parsed.data.body.length > 180 ? `${parsed.data.body.slice(0, 177)}…` : parsed.data.body,
      href: `/dashboard/messages?conversation=${message.conversationId}`,
    });
    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/conversations/:id/messages", async (req: AuthenticatedRequest, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to continue." : "Invalid conversation ID." },
    });
    return;
  }
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: id.data, OR: [{ userAId: req.userId }, { userBId: req.userId }] },
      select: { id: true },
    });
    if (!conversation) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Conversation not found." } });
      return;
    }
    const [messages] = await Promise.all([
      prisma.message.findMany({ where: { conversationId: id.data }, orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { id: true, username: true } } } }),
      prisma.message.updateMany({ where: { conversationId: id.data, senderId: { not: req.userId }, readAt: null }, data: { readAt: new Date() } }),
    ]);
    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/conversations/:id/messages", async (req: AuthenticatedRequest, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const parsed = z.object({ body: z.string().trim().min(1).max(5000) }).safeParse(req.body);
  if (!id.success || !parsed.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to send messages." : "Invalid message or conversation ID." },
    });
    return;
  }
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: id.data, OR: [{ userAId: req.userId }, { userBId: req.userId }] },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!conversation) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Conversation not found." } });
      return;
    }
    const message = await prisma.$transaction(async (transaction) => {
      const created = await transaction.message.create({
        data: { conversationId: conversation.id, senderId: req.userId!, body: parsed.data.body },
      });
      await transaction.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: created.createdAt } });
      return created;
    });
    const recipientId = conversation.userAId === req.userId ? conversation.userBId : conversation.userAId;
    const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await notifyUser({
      userId: recipientId,
      type: "MESSAGE",
      title: `New message from @${sender?.username ?? "a creator"}`,
      body: parsed.data.body.length > 180 ? `${parsed.data.body.slice(0, 177)}…` : parsed.data.body,
      href: `/dashboard/messages?conversation=${conversation.id}`,
    });
    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

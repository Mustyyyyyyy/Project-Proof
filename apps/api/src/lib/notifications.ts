import { prisma } from "./prisma.js";
import { sendNotificationEmail } from "./email.js";

export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  email?: boolean;
}) {
  let notification;
  try {
    notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      },
    });
  } catch (error) {
    console.error("Could not save in-app notification:", error);
    return null;
  }
  if (input.email === false) return notification;

  const recipient = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null, emailNotifications: true },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  if (recipient) {
    try {
      await sendNotificationEmail(
        recipient.email,
        recipient.profile?.fullName ?? "there",
        input.title,
        input.body,
        input.href,
      );
    } catch (error) {
      console.error("Could not send notification email:", error);
    }
  }
  return notification;
}

import { prisma } from "@openalternative/db"
import { ToolStatus } from "@openalternative/db/client"
import { NonRetriableError } from "inngest"
import { revalidateTag } from "next/cache"
import { config } from "~/config"
import EmailToolPublished from "~/emails/tool-published"
import { sendEmails } from "~/lib/email"
import { getPostLaunchTemplate, sendSocialPost } from "~/lib/socials"
import { inngest } from "~/services/inngest"

export const publishTools = inngest.createFunction(
  { id: "publish-tools" },
  { cron: "TZ=Europe/Warsaw 5 * * * *" }, // Every hour at minute 5
  async ({ step, logger }) => {
    const tools = await step.run("fetch-tools", async () => {
      return await prisma.tool.findMany({
        where: {
          status: ToolStatus.Scheduled,
          publishedAt: { lte: new Date() },
        },
      })
    })

    if (tools.length) {
      logger.info(`Publishing ${tools.length} tools`, { tools })

      for (const tool of tools) {
        // Update tool status
        await step.run(`update-tool-status-${tool.slug}`, async () => {
          const updatedTool = await prisma.tool.update({
            where: { id: tool.id },
            data: { status: ToolStatus.Published },
          })

          // Revalidate cache
          revalidateTag(`tool-${tool.slug}`)

          return updatedTool
        })

        // Revalidate cache
        await step.run("revalidate-cache", async () => {
          revalidateTag("tools")
          revalidateTag("schedule")
        })

        // Post on socials
        await step.run(`post-on-socials-${tool.slug}`, async () => {
          const template = getPostLaunchTemplate(tool)

          return await sendSocialPost(template, tool).catch(err => {
            throw new NonRetriableError(err.message)
          })
        })

        // Send email
        await step.run(`send-email-${tool.slug}`, async () => {
          if (!tool.submitterEmail) return

          const to = tool.submitterEmail
          const subject = `${tool.name} has been published on ${config.site.name} 🎉`

          return await sendEmails({
            to,
            subject,
            react: EmailToolPublished({ tool, to, subject }),
          })
        })
      }
    }

    // Disconnect from DB
    await step.run("disconnect-from-db", async () => {
      return await prisma.$disconnect()
    })
  },
)
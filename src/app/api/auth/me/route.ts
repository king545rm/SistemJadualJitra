import { getCurrentUser, okResponse } from '@/lib/session'

export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return Response.json({ user: null }, { status: 200 })
  }
  return okResponse({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      kursusId: session.kursusId,
      pensyarahId: session.pensyarahId,
      csrf: session.csrf,
    },
  })
}

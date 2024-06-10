import { FastifyInstance } from 'fastify'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', () => {
    return 'meals teste'
  })
}

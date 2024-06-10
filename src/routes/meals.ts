import { FastifyInstance } from 'fastify'
import { knex } from '../database'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return await knex('meals').select()
  })
}

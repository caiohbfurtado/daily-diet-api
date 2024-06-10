import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

type MealWithDate = {
  date: string
}

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const sessionId = request.cookies.sessionId

    const meals = await knex('meals')
      .select()
      .where('session_id', sessionId)
      .orderBy('created_at')
    const mealsWithinDiet = await knex('meals')
      .where({ session_id: sessionId, within_diet: false })
      .first()
      .count('', { as: 'count' })
    const mealsWithDiet = await knex('meals')
      .where({ session_id: sessionId, within_diet: true })
      .first()
      .count('', { as: 'count' })

    const mealsBestSequence = (await knex('meals')
      .distinct(knex.raw('SUBSTR(created_at, 1, 10) AS date'))
      .where({ session_id: sessionId, within_diet: true })
      .orderBy('date', 'asc')) as unknown as MealWithDate[]

    const calculateConsecutiveDays = () => {
      if (mealsBestSequence.length === 0) return 0

      let maxConsecutiveDays = 1
      let currentConsecutiveDays = 1

      for (let i = 1; i < mealsBestSequence.length; i++) {
        const currDate = Number(new Date(mealsBestSequence[i].date))
        const prevDate = Number(new Date(mealsBestSequence[i - 1].date))

        const diffTime = Math.abs(currDate - prevDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentConsecutiveDays += 1
          if (currentConsecutiveDays > maxConsecutiveDays) {
            maxConsecutiveDays = currentConsecutiveDays
          }
        } else {
          currentConsecutiveDays = 1
        }
      }

      return maxConsecutiveDays
    }

    return {
      meals,
      mealsQuantity: meals.length,
      mealsWithinDiet,
      mealsWithDiet,
      bestSequenceWithinDiet: calculateConsecutiveDays(),
    }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const sessionId = request.cookies.sessionId
    const getMealParamsSchema = z.object({
      id: z.string(),
    })

    const { id } = getMealParamsSchema.parse(request.params)
    const meal = await knex('meals')
      .select()
      .where({ session_id: sessionId, id })
      .first()

    return { meal }
  })

  app.put('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const sessionId = request.cookies.sessionId

    const updateMealParamsSchema = z.object({
      id: z.string(),
    })
    const { id } = updateMealParamsSchema.parse(request.params)

    const updateMealBodySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      within_diet: z.boolean().optional(),
      created_at: z.string().optional(),
    })
    const { description, name, within_diet, created_at } =
      updateMealBodySchema.parse(request.body)
    const mealUpdated = await knex('meals')
      .update({
        description,
        name,
        within_diet,
        created_at,
      })
      .where({ session_id: sessionId, id })
      .returning('*')

    return { mealUpdated: mealUpdated[0] }
  })

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const sessionId = request.cookies.sessionId
      const deleteMealParamsSchema = z.object({
        id: z.string(),
      })

      const { id } = deleteMealParamsSchema.parse(request.params)
      await knex('meals').delete().where({ session_id: sessionId, id })

      return reply.status(202).send()
    },
  )

  app.post('/', async (request, reply) => {
    const createMealsBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      within_diet: z.boolean(),
    })

    const { description, name, within_diet } = createMealsBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60624 * 7,
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      within_diet,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}

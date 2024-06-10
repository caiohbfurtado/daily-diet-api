import fastify from 'fastify'
import { mealsRoutes } from './routes/meals'
import fastifyCookie from '@fastify/cookie'

export const app = fastify()

app.register(fastifyCookie)

app.register(mealsRoutes, {
  prefix: 'meals',
})

import { beforeAll, afterAll, it, describe, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'

describe('Meals routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    await request(app.server)
      .post('/meals')
      .send({
        name: 'New Meal',
        description: 'New meal description.',
        within_diet: true,
      })
      .expect(201)
  })

  it('should be able to list all meals and info', async () => {
    const createNewMeal = await request(app.server)
      .post('/meals')
      .send({
        name: 'New Meal',
        description: 'New meal description.',
        within_diet: true,
      })
      .expect(201)

    const cookies = createNewMeal.get('Set-Cookie')

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200)

    expect(listMealsResponse.body).toEqual(
      expect.objectContaining({
        mealsQuantity: 1,
        mealsWithinDiet: 0,
        mealsWithDiet: 1,
        bestSequenceWithinDiet: 1,
      }),
    )

    expect(listMealsResponse.body.meals).toEqual([
      expect.objectContaining({
        name: 'New Meal',
        description: 'New meal description.',
        within_diet: 1,
      }),
    ])
  })

  it('should be able to list a specific meal', async () => {
    const createNewMeal = await request(app.server)
      .post('/meals')
      .send({
        name: 'New Meal',
        description: 'New meal description.',
        within_diet: true,
      })
      .expect(201)

    const cookies = createNewMeal.get('Set-Cookie')

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200)

    const mealId = listMealsResponse.body.meals[0].id

    const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies!)
      .expect(200)

    expect(getMealResponse.body.meal).toEqual(
      expect.objectContaining({
        name: 'New Meal',
        description: 'New meal description.',
        within_diet: 1,
      }),
    )
  })
})

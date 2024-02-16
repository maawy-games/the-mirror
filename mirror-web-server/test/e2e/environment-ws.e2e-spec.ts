import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { deleteFirebaseTestAccount, getFirebaseToken } from './e2e-auth'
import {
  clearTestDatabase,
  createTestAccountOnFirebaseAndDb,
  initTestMongoDbWithSeed,
  safetyCheckDatabaseForTest
} from './e2e-db-util'
import { afterAll, beforeAll, expect, it, describe } from 'vitest'
import { WsAdapter } from '@nestjs/platform-ws'
import WebSocket from 'ws'
import { environmentData } from '../stubs/space.model.stub'

/**
 * E2E Walkthrough: https://www.loom.com/share/cea8701390bf4e7ba234cc0689830399?from_recorder=1&focus_title=1
 */

describe('WS-E2E: environment', () => {
  let app: INestApplication
  let mongoDbUrl
  let dbName
  let userXAuthToken
  let createdUserXId
  let userXAccountEmail
  let userXAccountPassword
  let profile1
  let profile2
  let WSC: WebSocket
  let WS_Url

  beforeAll(async () => {
    // this is e2e, so we don't want to override ANYTHING if possible. We're only mocking the DB so that it doesn't hit a deployed intstance. You can use localhost if you wish (change useInMemoryMongo and dropMongoDatabaseAfterTest in jest-e2e.json)

    // initTestMongoDb needs to be run first so the mongodburl can be set for the app
    const dbSetup = await initTestMongoDbWithSeed()
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    mongoDbUrl = dbSetup.mongoDbUrl
    dbName = dbSetup.dbName

    // extra safety check
    safetyCheckDatabaseForTest()
    // create the full app
    app = moduleRef.createNestApplication()
    app.useWebSocketAdapter(new WsAdapter(app))
    await app.init()
    // websocket setup
    const address = app.getHttpServer().listen().address()
    WS_Url = `ws://[${address.address}]:${address.port}`

    WSC = new WebSocket(WS_Url, {
      headers: { Authorization: process.env.WSS_SECRET }
    })

    // create an account
    const { email, password } = await createTestAccountOnFirebaseAndDb(app)
    // set the test-level variables
    userXAccountEmail = email
    userXAccountPassword = password
    const tokenResponse = await getFirebaseToken(email, password)
    createdUserXId = tokenResponse.localId
    userXAuthToken = tokenResponse.idToken

    // Creating two profiles
    let token
    let profile
    profile = await createTestAccountOnFirebaseAndDb(app)
    token = await getFirebaseToken(profile.email, profile.password)
    profile1 = { ...profile, ...token }
    profile = await createTestAccountOnFirebaseAndDb(app)
    token = await getFirebaseToken(profile.email, profile.password)
    profile2 = { ...profile, ...token }
  })

  afterAll(async () => {
    await clearTestDatabase(mongoDbUrl, dbName)
    await deleteFirebaseTestAccount(app, userXAccountEmail)

    // Deleting test account from firebase account
    await deleteFirebaseTestAccount(app, profile1.email)
    await deleteFirebaseTestAccount(app, profile2.email)

    WSC.close()
  })

  it('alive test: should get the version of the app', async () => {
    return request(app.getHttpServer())
      .get(`/util/version`)
      .expect(200)
      .then((res) => {
        expect(res.text).toEqual(require('../../package.json').version)
      })
  })

  it('should connect to the WebSocket server', () => {
    WSC.on('open', () => {
      expect(WSC.readyState).toEqual(WebSocket.OPEN)
    })
  })

  describe('should get and update environment', () => {
    it('should get environment', async () => {
      const eventData = {
        event: 'zone_get_environment',
        data: {
          id: environmentData._id
        }
      }

      WSC = new WebSocket(WS_Url, {
        headers: { Authorization: process.env.WSS_SECRET }
      })

      await new Promise((resolve) => {
        WSC.onopen = () => {
          WSC.send(JSON.stringify(eventData))
          resolve(true)
        }
      })

      await new Promise((resolve) => {
        WSC.on('message', (message) => {
          expect(message).toBeDefined()
          if (message) {
            const responseMessage = JSON.parse(message.toString())
            expect(responseMessage.status).toBe(200)
            expect(responseMessage.result.ssao).toBeTruthy()
            expect(responseMessage.result.glow).toBeTruthy()
            expect(responseMessage.result.fogColor).toEqual(
              environmentData.fogColor
            )
            expect(responseMessage.result.fogDensity).toEqual(
              environmentData.fogDensity
            )
            expect(responseMessage.result.fogEnabled).toEqual(
              environmentData.fogEnabled
            )
            expect(responseMessage.result.fogVolumetric).toEqual(
              environmentData.fogVolumetric
            )
            expect(responseMessage.result.globalIllumination).toEqual(
              environmentData.globalIllumination
            )
            expect(responseMessage.result.skyBottomColor).toEqual(
              environmentData.skyBottomColor
            )
            expect(responseMessage.result.skyHorizonColor).toEqual(
              environmentData.skyHorizonColor
            )
            expect(responseMessage.result.skyTopColor).toEqual(
              environmentData.skyTopColor
            )
            expect(responseMessage.result.sunCount).toEqual(
              environmentData.sunCount
            )
            expect(responseMessage.result.suns).toEqual(environmentData.suns)

            WSC.close()
            resolve(true)
          }
        })
      })
    })

    it('should update environment', async () => {
      const eventData = {
        event: 'zone_update_environment',
        data: {
          id: environmentData._id,
          dto: {
            environment: 'demo',
            skyTopColor: [1, 2, 1]
          }
        }
      }

      WSC = new WebSocket(WS_Url, {
        headers: { Authorization: process.env.WSS_SECRET }
      })

      await new Promise((resolve) => {
        WSC.onopen = () => {
          WSC.send(JSON.stringify(eventData))
          resolve(true)
        }
      })

      await new Promise((resolve) => {
        WSC.on('message', (message) => {
          expect(message).toBeDefined()
          if (message) {
            const responseMessage = JSON.parse(message.toString())
            expect(responseMessage.status).toBe(200)
            expect(responseMessage.result.environment).toEqual('demo')
            expect(responseMessage.result.skyTopColor).toEqual([1, 2, 1])

            WSC.close()
            resolve(true)
          }
        })
      })
    })
  })
})

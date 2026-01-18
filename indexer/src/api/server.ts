import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { getSyncStatus } from '../indexer/sync.js'

import blocksRouter from './routes/blocks.js'
import transactionsRouter from './routes/transactions.js'
import eventsRouter from './routes/events.js'
import addressRouter from './routes/address.js'
import contractsRouter from './routes/contracts.js'
import statsRouter from './routes/stats.js'
import bridgeRouter from './routes/bridge.js'

export function createServer() {
  const app = express()

  // Middleware
  app.use(express.json())

  // CORS
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      maxAge: 3600,
    })
  )

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
    },
  })
  app.use('/api/', limiter)

  // Routes
  app.use('/api/blocks', blocksRouter)
  app.use('/api/transactions', transactionsRouter)
  app.use('/api/address', addressRouter)
  app.use('/api/events', eventsRouter)
  app.use('/api/contracts', contractsRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/bridge', bridgeRouter)

  // Health endpoint directly
  app.get('/api/health', (_req, res) => {
    const { status, lastIndexedBlock } = getSyncStatus()
    res.json({
      success: true,
      data: {
        status,
        lastIndexedBlock,
        timestamp: Date.now(),
      },
    })
  })

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
    })
  })

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Server error:', err)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  )

  return app
}

export function startServer() {
  const app = createServer()

  app.listen(config.port, () => {
    console.log(`API server listening on port ${config.port}`)
    console.log(`Endpoints:`)
    console.log(`  GET  /api/blocks`)
    console.log(`  GET  /api/blocks/:number`)
    console.log(`  GET  /api/blocks/:number/transactions`)
    console.log(`  GET  /api/transactions`)
    console.log(`  GET  /api/transactions/:hash`)
    console.log(`  GET  /api/address/:address/transactions`)
    console.log(`  GET  /api/address/:address/events`)
    console.log(`  GET  /api/address/:address/events/decoded`)
    console.log(`  GET  /api/events?topic0=0x...`)
    console.log(`  GET  /api/contracts`)
    console.log(`  GET  /api/contracts/:address`)
    console.log(`  POST /api/contracts`)
    console.log(`  POST /api/contracts/:address/decode`)
    console.log(`  GET  /api/stats`)
    console.log(`  GET  /api/stats/validators`)
    console.log(`  GET  /api/bridge/payments`)
    console.log(`  GET  /api/bridge/status`)
    console.log(`  GET  /api/health`)
  })

  return app
}

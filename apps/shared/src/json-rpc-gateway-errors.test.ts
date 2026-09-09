import { describe, expect, it } from 'vitest'

import { JsonRpcGatewayClient } from './json-rpc-gateway'

describe('JsonRpcGatewayClient error messages', () => {
  it('evaluates a message supplier when each disconnected request fails', async () => {
    let message = 'first message'
    const client = new JsonRpcGatewayClient({ notConnectedErrorMessage: () => message })

    await expect(client.request('first.method')).rejects.toThrow('first message')

    message = 'second message'
    await expect(client.request('second.method')).rejects.toThrow('second message')
  })
})

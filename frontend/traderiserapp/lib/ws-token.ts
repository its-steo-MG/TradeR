"use server"

/**
 * Server action to securely fetch WebSocket token
 * This keeps the token on the server and away from client code
 */
export async function getWebSocketToken(): Promise<string> {
  const token = process.env.WS_AUTH_TOKEN || ""
  return token
}

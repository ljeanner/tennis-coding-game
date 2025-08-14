import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPlayer, upsertPlayer } from '../shared/database';

export async function players(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`HTTP function processed request for url "${request.url}"`);

  const playerId = request.params.playerId;

  try {
    if (request.method === 'GET') {
      if (!playerId) {
        return {
          status: 400,
          jsonBody: { error: 'Player ID is required' }
        };
      }

      const player = await getPlayer(playerId);
      if (!player) {
        return {
          status: 404,
          jsonBody: { error: 'Player not found' }
        };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        jsonBody: player
      };
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      if (!body.playerId || !body.playerName) {
        return {
          status: 400,
          jsonBody: { error: 'playerId and playerName are required' }
        };
      }

      const player = await upsertPlayer(body.playerId, body.playerName);

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        jsonBody: player
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };

  } catch (error) {
    context.log('Error in players function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('players', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'players/{playerId?}',
  handler: players
});

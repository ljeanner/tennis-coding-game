import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { updatePlayerScore, getPlayerScoreHistory } from '../shared/database';

export async function scores(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`HTTP function processed request for url "${request.url}"`);

  try {
    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      };
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      
      if (!body.playerId || typeof body.score !== 'number') {
        return {
          status: 400,
          jsonBody: { error: 'playerId and score are required' }
        };
      }

      const updatedPlayer = await updatePlayerScore(body.playerId, body.score);

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        jsonBody: updatedPlayer
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };

  } catch (error) {
    context.log('Error in scores function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('scores', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'scores',
  handler: scores
});

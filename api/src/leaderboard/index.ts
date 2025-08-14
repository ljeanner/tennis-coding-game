import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getLeaderboard } from '../shared/database';

export async function leaderboard(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`HTTP function processed request for url "${request.url}"`);

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 10;

      const leaderboard = await getLeaderboard(limit);

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        jsonBody: leaderboard
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };

  } catch (error) {
    context.log('Error in leaderboard function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('leaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: leaderboard
});

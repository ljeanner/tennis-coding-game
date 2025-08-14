import { app } from '@azure/functions';

// Import all function handlers
import './players/index';
import './scores/index';
import './leaderboard/index';

// This file is the main entry point that registers all functions
export default app;

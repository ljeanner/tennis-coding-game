import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const connectionString = process.env.AZURE_SQL_CONNECTIONSTRING;
  if (!connectionString) {
    throw new Error('AZURE_SQL_CONNECTIONSTRING environment variable is not set');
  }

  try {
    pool = new sql.ConnectionPool(connectionString);
    await pool.connect();
    
    // Initialize database schema if needed
    await initializeSchema(pool);
    
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

async function initializeSchema(pool: sql.ConnectionPool): Promise<void> {
  try {
    const request = pool.request();
    
    // Create Players table if it doesn't exist
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Players' AND xtype='U')
      BEGIN
        CREATE TABLE Players (
          PlayerId UNIQUEIDENTIFIER PRIMARY KEY,
          PlayerName NVARCHAR(100) NOT NULL,
          CurrentScore INT DEFAULT 0,
          BestScore INT DEFAULT 0,
          GamesPlayed INT DEFAULT 0,
          CreatedAt DATETIME2 DEFAULT GETDATE(),
          LastSeenAt DATETIME2 DEFAULT GETDATE()
        )
      END
    `);

    // Create GameScores table for score history
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GameScores' AND xtype='U')
      BEGIN
        CREATE TABLE GameScores (
          ScoreId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          PlayerId UNIQUEIDENTIFIER NOT NULL,
          Score INT NOT NULL,
          GameDate DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (PlayerId) REFERENCES Players(PlayerId)
        )
      END
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

export interface Player {
  playerId: string;
  playerName: string;
  currentScore?: number;
  bestScore?: number;
  gamesPlayed?: number;
  createdAt?: Date;
  lastSeenAt?: Date;
}

export interface GameScore {
  scoreId: string;
  playerId: string;
  score: number;
  gameDate: Date;
}

export async function upsertPlayer(playerId: string, playerName: string): Promise<Player> {
  const pool = await getDbPool();
  const request = pool.request();

  try {
    const result = await request
      .input('playerId', sql.VarChar(36), playerId)
      .input('playerName', sql.NVarChar(100), playerName)
      .query(`
        DECLARE @pid UNIQUEIDENTIFIER = TRY_CONVERT(UNIQUEIDENTIFIER, @playerId);
        IF @pid IS NULL SET @pid = NEWID();
        MERGE Players AS target
        USING (SELECT @pid AS PlayerId, @playerName AS PlayerName) AS source
        ON target.PlayerId = source.PlayerId
        WHEN MATCHED THEN
          UPDATE SET 
            PlayerName = source.PlayerName,
            LastSeenAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (PlayerId, PlayerName, CreatedAt, LastSeenAt)
          VALUES (source.PlayerId, source.PlayerName, GETDATE(), GETDATE());

        SELECT PlayerId, PlayerName, CurrentScore, BestScore, GamesPlayed, CreatedAt, LastSeenAt
        FROM Players 
        WHERE PlayerId = @pid;
      `);

    const player = result.recordset[0];
    return {
      playerId: player.PlayerId,
      playerName: player.PlayerName,
      currentScore: player.CurrentScore || 0,
      bestScore: player.BestScore || 0,
      gamesPlayed: player.GamesPlayed || 0,
      createdAt: player.CreatedAt,
      lastSeenAt: player.LastSeenAt
    };
  } catch (error) {
    console.error('Failed to upsert player:', error);
    throw error;
  }
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const pool = await getDbPool();
  const request = pool.request();

  try {
    const result = await request
      .input('playerId', sql.VarChar(36), playerId)
      .query(`
        SELECT PlayerId, PlayerName, CurrentScore, BestScore, GamesPlayed, CreatedAt, LastSeenAt
        FROM Players 
        WHERE PlayerId = TRY_CONVERT(UNIQUEIDENTIFIER, @playerId)
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const player = result.recordset[0];
    return {
      playerId: player.PlayerId,
      playerName: player.PlayerName,
      currentScore: player.CurrentScore || 0,
      bestScore: player.BestScore || 0,
      gamesPlayed: player.GamesPlayed || 0,
      createdAt: player.CreatedAt,
      lastSeenAt: player.LastSeenAt
    };
  } catch (error) {
    console.error('Failed to get player:', error);
    throw error;
  }
}

export async function updatePlayerScore(playerId: string, score: number): Promise<Player> {
  const pool = await getDbPool();
  const request = pool.request();

  try {
    await request
      .input('playerId', sql.VarChar(36), playerId)
      .input('score', sql.Int, score)
      .query(`
        DECLARE @pid UNIQUEIDENTIFIER = TRY_CONVERT(UNIQUEIDENTIFIER, @playerId);
        IF @pid IS NULL THROW 50001, 'Invalid playerId', 1;

        UPDATE Players 
        SET 
          CurrentScore = @score,
          BestScore = CASE WHEN @score > BestScore THEN @score ELSE BestScore END,
          GamesPlayed = GamesPlayed + 1,
          LastSeenAt = GETDATE()
        WHERE PlayerId = @pid;

        INSERT INTO GameScores (PlayerId, Score)
        VALUES (@pid, @score);
      `);

    const player = await getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found after score update');
    }

    return player;
  } catch (error) {
    console.error('Failed to update player score:', error);
    throw error;
  }
}

export async function getPlayerScoreHistory(playerId: string, limit: number = 10): Promise<GameScore[]> {
  const pool = await getDbPool();
  const request = pool.request();

  try {
    const result = await request
      .input('playerId', sql.VarChar(36), playerId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) ScoreId, PlayerId, Score, GameDate
        FROM GameScores 
        WHERE PlayerId = TRY_CONVERT(UNIQUEIDENTIFIER, @playerId)
        ORDER BY GameDate DESC
      `);

    return result.recordset.map(record => ({
      scoreId: record.ScoreId,
      playerId: record.PlayerId,
      score: record.Score,
      gameDate: record.GameDate
    }));
  } catch (error) {
    console.error('Failed to get player score history:', error);
    throw error;
  }
}

export async function getLeaderboard(limit: number = 10): Promise<Player[]> {
  const pool = await getDbPool();
  const request = pool.request();

  try {
    const result = await request
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) PlayerId, PlayerName, CurrentScore, BestScore, GamesPlayed, CreatedAt, LastSeenAt
        FROM Players 
        WHERE BestScore > 0
        ORDER BY BestScore DESC, GamesPlayed ASC
      `);

    return result.recordset.map(player => ({
      playerId: player.PlayerId,
      playerName: player.PlayerName,
      currentScore: player.CurrentScore || 0,
      bestScore: player.BestScore || 0,
      gamesPlayed: player.GamesPlayed || 0,
      createdAt: player.CreatedAt,
      lastSeenAt: player.LastSeenAt
    }));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw error;
  }
}

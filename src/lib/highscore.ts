export interface HighScore {
  name: string;
  score: number;
}

const HIGH_SCORES_KEY_PREFIX = 'high_scores_';

export const getHighScores = (game: string): HighScore[] => {
  try {
    const key = `${HIGH_SCORES_KEY_PREFIX}${game}`;
    const scoresJSON = localStorage.getItem(key);
    if (!scoresJSON) {
      return [];
    }
    const scores = JSON.parse(scoresJSON);
    // Ensure it's an array, sort by score descending
    if (Array.isArray(scores)) {
      return scores.sort((a, b) => b.score - a.score);
    }
    return [];
  } catch (error) {
    console.error('Error getting high scores:', error);
    return [];
  }
};

export const addHighScore = (game: string, score: HighScore): void => {
  try {
    const key = `${HIGH_SCORES_KEY_PREFIX}${game}`;
    const highScores = getHighScores(game);
    highScores.push(score);
    highScores.sort((a, b) => b.score - a.score);
    // Keep only top 10
    const newHighScores = highScores.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(newHighScores));
  } catch (error) {
    console.error('Error adding high score:', error);
  }
};

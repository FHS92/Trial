import { useState, useRef, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import LoadingScreen from './components/LoadingScreen';
import InfographicPage from './components/InfographicPage';
import type { AppView, InfographicData, Theme } from './types/infographic';
import { generateInfographic } from './lib/api';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [topic, setTopic] = useState('');
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('editorial-light');

  const handleGenerate = useCallback(async (inputTopic: string) => {
    const trimmed = inputTopic.trim();
    if (!trimmed) return;

    setTopic(trimmed);
    setError(null);
    setView('loading');

    try {
      const data = await generateInfographic(trimmed);
      setInfographicData(data);
      setTheme(data.theme);
      setView('infographic');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setView('landing');
    }
  }, []);

  const handleBack = useCallback(() => {
    setView('landing');
    setError(null);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!topic) return;
    await handleGenerate(topic);
  }, [topic, handleGenerate]);

  const handleThemeToggle = useCallback(() => {
    setTheme(prev => prev === 'editorial-light' ? 'midnight-data' : 'editorial-light');
  }, []);

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <LandingPage
          onGenerate={handleGenerate}
          error={error}
          initialTopic={topic}
        />
      )}
      {view === 'loading' && (
        <LoadingScreen topic={topic} />
      )}
      {view === 'infographic' && infographicData && (
        <InfographicPage
          data={infographicData}
          theme={theme}
          topic={topic}
          onBack={handleBack}
          onRegenerate={handleRegenerate}
          onThemeToggle={handleThemeToggle}
        />
      )}
    </div>
  );
}

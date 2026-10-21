import { useEffect } from 'react';
import { announceGuidedSequence } from '../services/guidedSpeech';

export default function useGuidedAnnouncement(enabled, eventKey, messages, pauseMs = 450) {
  const content = (Array.isArray(messages) ? messages : [messages]).join('\n');

  useEffect(() => {
    if (enabled && content) announceGuidedSequence(content.split('\n'), { pauseMs });
  }, [enabled, eventKey, content, pauseMs]);
}

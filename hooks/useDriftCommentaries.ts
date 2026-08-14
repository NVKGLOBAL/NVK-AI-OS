
import { useState, useEffect } from 'react';
import type { DriftCommentary } from '../types';
import { driftDB } from '../db';

export const useDriftCommentaries = (driftInterpretationId: number | undefined): { commentaries: DriftCommentary[], isLoading: boolean } => {
  const [commentaries, setCommentaries] = useState<DriftCommentary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (driftInterpretationId === undefined) {
      setCommentaries([]);
      return;
    }

    const fetchCommentaries = async () => {
      setIsLoading(true);
      try {
        const fetchedCommentaries = await driftDB.getCommentariesForDrift(driftInterpretationId);
        setCommentaries(fetchedCommentaries);
      } catch (error) {
        console.error(`Failed to fetch commentaries for drift ID ${driftInterpretationId}:`, error);
        setCommentaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommentaries();
  }, [driftInterpretationId]);

  return { commentaries, isLoading };
};

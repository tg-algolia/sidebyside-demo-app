import { useEffect } from 'react';
import { useSearchBox } from 'react-instantsearch';

/**
 * Invisible component that lives inside an InstantSearch context.
 * Syncs an external controlled query into InstantSearch's internal state
 * so that Highlight components and pagination work correctly.
 */
export default function SyncSearchBox({ query }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(query);
  }, [query, refine]);

  return null;
}

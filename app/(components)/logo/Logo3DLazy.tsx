'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy wrapper around `Logo3D` (CLEAN-A bundle-size follow-up). `Logo3D`
 * itself renders nothing until after client mount (a `useHasMounted`
 * placeholder, see its own file) — it never needs to be in a route's
 * initial JS. `next/dynamic` with `ssr: false` moves three +
 * `@react-three/fiber` (the bulk of every page's shared JS, per the
 * bundle breakdown) into their own chunk, fetched once mounted instead of
 * shipped with every route's initial load. `ssr: false` requires a Client
 * Component boundary, which is why this thin wrapper exists — so
 * Server Components (`Footer`) can still reach it without becoming client
 * components themselves.
 */
const Logo3D = dynamic(() => import('./Logo3D'), { ssr: false });

export default Logo3D;

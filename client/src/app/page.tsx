'use client'

import { useWeb3Auth } from '@/context/Web3AuthContext';

export default function Home() {

  const { signInWithDiscord } = useWeb3Auth();


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      
      <button onClick={signInWithDiscord}>Login</button>

    </main>
  );
}

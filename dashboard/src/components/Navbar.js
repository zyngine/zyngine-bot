'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-discord-darker border-b border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-discord-accent">
          Zyngine
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition">
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt="Avatar"
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                )}
                <span className="text-gray-300">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white transition"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="btn-primary"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

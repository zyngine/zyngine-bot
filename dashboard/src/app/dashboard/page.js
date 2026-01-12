'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchGuilds();
    }
  }, [session]);

  const fetchGuilds = async () => {
    try {
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      const data = await response.json();

      // Filter to guilds where user has MANAGE_GUILD permission
      const manageableGuilds = data.filter(guild =>
        (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20)
      );

      setGuilds(manageableGuilds);
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-discord-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Your Servers</h1>

        {guilds.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-lg">No servers found where you have manage permissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds.map((guild) => (
              <div key={guild.id} className="card hover:border hover:border-discord-accent transition cursor-pointer">
                <div className="flex items-center gap-4">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-discord-accent flex items-center justify-center text-2xl font-bold">
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{guild.name}</h3>
                    <p className="text-gray-400 text-sm">ID: {guild.id}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/dashboard/${guild.id}`}
                    className="btn-primary flex-1 text-center"
                  >
                    Manage
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

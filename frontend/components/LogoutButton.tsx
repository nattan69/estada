'use client';

// Botó de logout — component client petit (el layout root es manté Server Component)
export default function LogoutButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') {
          import('@/lib/api').then(({ logout }) => {
            logout();
            window.location.href = '/login';
          });
        }
      }}
      className="text-left text-slate-400 hover:text-brand-gold p-2 rounded"
    >
      Logout
    </button>
  );
}
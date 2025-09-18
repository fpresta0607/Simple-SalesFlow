import { getSession } from "@/lib/auth";

export default async function UserMenu() {
  const session = await getSession();
  if (!session?.user?.email) {
    return (
      <a href="/login" className="rounded-full px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100">Sign in</a>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{session.user.email}</div>
      <form action="/api/auth/signout" method="post">
        <button className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-slate-800">Sign out</button>
      </form>
    </div>
  );
}
